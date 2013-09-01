
(function(jQuery,nuxeo) {

    if (nuxeo.shell_builtins === undefined) {
      nuxeo.shell_builtins={};
    }

    function nxshell() {

      this.automationDefs= [];
      this.builtins = [];
      this.ctx = { path : "/" };

      var me = this;
      var shell = this;

      var initBuiltIns = function() {
        var builtInsDefs = nuxeo.shell_builtins;
        for (var key in builtInsDefs ) {
          var name = key;
          if (name.indexOf("Cmd")>0){
            name = name.substring(0,name.indexOf("Cmd"));
          }
          var builtin = function(k) { return function(cmds, term) { return builtInsDefs[k](cmds, term, shell)}}(key);

          shell.builtins.push({ id : name, impl : builtin});
        }
      }

      nxshell.prototype.getAutomationDefs = function () {
          return this.automationDefs;
      }

      nxshell.prototype.displayPage = function (term, prevPageCB, nextPageCB) {
        term.push(jQuery.noop, {      
          keydown: function(e) {
            if (e.which === 38 ) { //up
              prevPageCB();
            } else if (e.which === 40) { //down
               nextPageCB();
            } else if (e.which === 34) { // Page up
               prevPageCB();
            } else if (e.which === 33) { // page down
               nextPageCB();
            } else if (e.which == 81) { //Q
              term.pop();
            }
          }
        });
      }

      nxshell.prototype.nxGreetings = function () {
          var head = "";
          head+="  _   _                      _____ _          _ _  \n";
          head+=" | \\ | |                    / ____| |        | | | \n";
          head+=" |  \\| |_   ___  _____  ___| (___ | |__   ___| | | \n";
          head+=" | . ` | | | \\ \\/ / _ \\/ _ \\\\___ \\| '_ \\ / _ \\ | | \n";
          head+=" | |\\  | |_| |>  <  __/ (_) |___) | | | |  __/ | | \n";
          head+=" |_| \\_|\\__,_/_/\\_\\___|\\___/_____/|_| |_|\\___|_|_| \n\n\n";
          return head;
      }

      nxshell.prototype.fetchAutomationDefs = function () {
         var me = this;
         jQuery.ajax({
              type: 'GET',
              contentType : 'application/json',
              url: "/nuxeo/site/automation",
              success: function(data, status,xhr) {
                if (status=="success") {
                  me.automationDefs = data;
                } else {
                  console.log("Error, Status =" + status);
                }
              }
            });
       }

      nxshell.prototype.nxTermHandler = function (cmd, term) {
           var cmds = cmd.split(" ");

           var me = this;
           var cmd = this.findBuiltin(cmds[0]);
           if (cmd) {
             cmd.impl(cmds, term);
             return;
           }
           var op = this.findOperation(cmds[0]);
           if (op) {
             var opts = {automationParams : { params : {},
                 context : {}} };
             for (var i = 1; i < cmds.length; i++) {
               var arg = cmds[i];
               if (arg.indexOf("=")>0) {
                 var param = arg.split("=");
                 opts.automationParams.params[param[0]]=param[1];
               }
             }

             nuxeo.operation(op.id, opts)
              .done(function(data, status,xhr) {
                term.echo(me.prettyPrint(data));
              })
              .fail(function(xhr,status) {
                term.echo("Error " + status);
              })
              .execute()
           }
           console.log(cmd);
      }

      nxshell.prototype.printDoc = function (doc) {
        var title = doc.title;
        if (!title) {
          title = doc.uid;
        }
        return title + " " + doc.path + " (" + doc.type + ")";
      }

      nxshell.prototype.prettyPrint = function (ob) {
        var type = ob['entity-type'];
        if (type == 'document') {
          return this.printDoc(ob);
        } else {
          return JSON.stringify(ob);
        }
      }

      nxshell.prototype.findOperation = function (operationId) {
         for (var idx=0; idx < this.automationDefs.operations.length; idx++) {
            var op = this.automationDefs.operations[idx];
            if (op.id===operationId) {
              return op;
            }
         }
         for (var idx=0; idx < this.automationDefs.chains.length; idx++) {
             var op = this.automationDefs.chains[idx];
             if (op.id===operationId) {
               return op;
             }
         }
         return null;
      }

      nxshell.prototype.findBuiltin = function (cmdId) {
        for (var idx=0; idx < this.builtins.length; idx++) {
          var cmd = this.builtins[idx];
          if (cmd.id===cmdId) {
            return cmd;
          }
        }
        return null;
      }

      nxshell.prototype.completion = function (term,input,callback) {
          var existingInput = term.get_command().trim();
          var suggestions = [];
          var cmd = this.findBuiltin(existingInput.split(" ")[0]);
          if (cmd) {
            // XXX
          } else {
            var op = this.findOperation(existingInput.split(" ")[0]);
            if (op) {
             for (var idx=0; idx < op.params.length; idx++) {
               var pName = op.params[idx].name;
               if (existingInput.indexOf(pName + "=")>0) {
                 continue;
               }
               if (pName.indexOf(input)==0) {
                 suggestions.push(pName + "=");
               }
               callback(suggestions);
             }
            } else {
              var cmd = input.split(" ")[0];
              for (var idx=0; idx < this.automationDefs.operations.length; idx++) {
                var op = this.automationDefs.operations[idx];
                if (op.id.indexOf(cmd)==0) {
                  suggestions.push(op.id);
                }
                if (suggestions.length > 5) {
                  break;
                }
              }
              for (var idx=0; idx < this.builtins.length; idx++) {
                  var op = this.builtins[idx];
                  if (op.id.indexOf(cmd)==0) {
                    suggestions.push(op.id);
                  }
                  if (suggestions.length > 5) {
                    break;
                  }
                }
              callback(suggestions);
            }
          }
        }

        // **************************
        // init shell object
        // 1 - init BuiltIns
        initBuiltIns();
        // 2 - fetch Operation definitions
        this.fetchAutomationDefs();
        // 3 - fetch Root Document to init context
        nuxeo.operation('Document.Fetch' , { automationParams : {params : { value : "/"}}})
                  .done(function(data, status,xhr) {
                    me.ctx.path = data.path;
                    me.ctx.doc = data;                
                  })
                  .fail(function(xhr,status) {
                    console.log("Error " + status);
                  })
                  .execute();
        
    };

   nuxeo.DEFAULT_NXSHELL = {
       prompt: 'nx> ',
       name: 'nxshell',
       tabcompletion : true
   }

   nuxeo.shell = function(filter, opts) {
       var nx = new nxshell();
       var opts = jQuery.extend({}, nuxeo.DEFAULT_NXSHELL , opts);
       opts.greetings = function() { return nx.nxGreetings()};
       opts.completion =  function (term,input,callback)  { return nx.completion(term,input,callback)};
       jQuery(filter).terminal(function (cmd, term) 
                    { 
                      return nx.nxTermHandler(cmd, term)
                    }, opts);
       };
  
})(jQuery,this.nuxeo === undefined ? this.nuxeo = {} : this.nuxeo)

