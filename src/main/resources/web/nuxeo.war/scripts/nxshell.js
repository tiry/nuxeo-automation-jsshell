
(function(jQuery,nuxeo) {

    if (nuxeo.shell_builtins === undefined) {
      nuxeo.shell_builtins={};
    }

    function nxshell(opts) {

      this.automationDefs= [];
      this.builtins = [];
      this.ctx = { path : "/" };
      this.opts = opts;
      
      var me = this;
      var shell = this;

      var initBuiltIns = function() {
        var builtInsDefs = nuxeo.shell_builtins;
        for (var key in builtInsDefs ) {
          var name = key;

          if (name.indexOf("Cmd")>0){
            name = name.substring(0,name.indexOf("Cmd"));
          }
          if (name.indexOf("Help")>0){
            continue;
          }
          var builtin = function(k) { return function(cmds, term) { return builtInsDefs[k].impl(cmds, term, shell)}}(key);
          var helpStr =  builtInsDefs[key].help;
          var suggestLst =  builtInsDefs[key].suggest;
          shell.builtins.push({ id : name, impl : builtin, help : helpStr, suggest : suggestLst});
        }
      }

      nxshell.prototype.getAutomationDefs = function () {
          return this.automationDefs;
      }

      nxshell.prototype.displayNavigationPrompt = function (term, prevPageCB, nextPageCB) {
        term.set_prompt("( use arrows to navigate between pages - q to quit )");
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
              term.set_prompt(opts.prompt);
            }
          }
        });
      }

      nxshell.prototype.displayPages = function (term, list, pageSize, offset) {

        for (var idx = offset; (idx < list.length) && (idx < offset + pageSize) ; idx++) {
          term.echo(list[idx]);
        }

        var nextCB = function() {
          me.displayPages(term, list, pageSize, offset+pageSize);
        }
        var prevCB = function() {
          me.displayPages(term, list, pageSize, offset-pageSize);
        }
        if (offset+pageSize> list.length) {
          term.echo(" ... end of listing ... ");
          nextCB = function() {
              term.pop();
              term.set_prompt(opts.prompt);            
          }
        }
        if (offset-pageSize< 0) {
          prevCB = function() {};
        }

        me.displayNavigationPrompt(term, prevCB, nextCB);
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

      nxshell.prototype.displayHelp = function (cmd, term) {
        if (cmd === undefined) {
          term.echo("use help 'commandName' to get help on the command or operation named 'commandName'");
          term.echo("use help cmds to list all commands");
          term.echo("use help ops to list all operations");
        } else if (cmd == 'cmds') {
          for (var idx=0; idx < this.builtins.length; idx++) {
            term.echo("[[b;#00EE00;#0]" + this.builtins[idx].id + "] : [[i;#CCCCCC;#0]" + this.builtins[idx].help + "]");
          }
        } else if (cmd == 'ops') {
          var lines = [];
          for (var idx=0; idx < this.automationDefs.operations.length; idx++) {
            lines.push("[[b;#00EE00;#0]" + this.automationDefs.operations[idx].id + "] : [[i;#CCCCCC;#0]" + this.automationDefs.operations[idx].label + "]");
          }
          this.displayPages(term, lines, 10, 0);
        } else {
          var cmdOp = this.findBuiltin(cmd);
          if (cmdOp) {
            term.echo(cmdOp.help);
          } else {
           var op = this.findOperation(cmd); 
           if (op) {
            term.echo(op.label);
            term.echo(op.description);
            term.echo(JSON.stringify(op.signature));
           } else {
            term.echo("unknown command " + cmd);
           }
          }
        }
      }

      nxshell.prototype.nxTermHandler = function (cmd, term) {
           var cmds = cmd.split(" ");

           var me = this;
           // help
           if(cmds[0]=="help" || cmds[0]=="?") {
            if (cmds.length>1) {
              this.displayHelp(cmds[1], term);
            } else {
              this.displayHelp(undefined,term);
            }
            return;
           }
           // built-ins
           var cmd = this.findBuiltin(cmds[0]);
           if (cmd) {
             cmd.impl(cmds, term);
             return;
           }
           // operations
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
              .execute();
              return;
           }

           if (cmds[0]!="") {
            term.echo("command [[b;#EE9900;#0]" + cmds[0] + "] not found");
           }
      }

      nxshell.prototype.printDoc = function (doc) {
        var title = doc.title;
        if (!title) {
          title = "";
        }
        return "[" + doc.uid + "] " + doc.path + "'" + title + "' " + doc.path + " (" + doc.type + ")";
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
      
      var suggesters = {
        path : function(term, totalInput, value, callback ) {
          var suggestions = [];

          var absolutePath = value;
          if (value.indexOf("/")!=0){
            absolutePath  = shell.ctx.path;
            if (absolutePath[absolutePath.length-1]!="/") {
              absolutePath = absolutePath + "/";
            }
            absolutePath = absolutePath + value;
          }

          var parentPath = absolutePath.substring(0, absolutePath.lastIndexOf("/")+1);
          var name = absolutePath.substring(absolutePath.lastIndexOf("/")+1);

          var query = "select * from Document where ecm:path STARTSWITH '" + parentPath + "' AND ecm:isCheckedInVersion= 0";
          if (name.length>0) {
            query = query + " AND ecm:name LIKE '" + name + "%' ";
          }
          query = query + " order by ecm:path ";

          var operation = nuxeo.operation('Document.PageProvider' , {
            automationParams: {
              params: {
                query: query,
                pageSize: 10,
                page: 0
             }
           }
          });

          operation.done(function(docs, status,xhr) {
               console.log("returned !")
               if (docs.entries.length > 9) {
                  term.echo("... too much results to complete ...");
                  return;
               }
               for (var i =0 ; i < docs.entries.length; i++) {
                if (value.indexOf("/")!=0) {                  
                  suggestions.push(docs.entries[i].path.substring(shell.ctx.path.length));                  
                } else {
                  suggestions.push(docs.entries[i].path);                  
                }                
               }     
               callback(suggestions);                  
              })
          .fail(function (xhr, status) { console.log("Error", status);})
          .execute();
        }
      }

      nxshell.prototype.cmdParamCompletion = function (term,cmd,input,callback) {
        
        if (cmd.suggest.length>0) {
          var args = input.split(" ");
          args.shift();
          var idx = args.length-1;
          var value = "";
          if (idx>=0) {
            value = args[idx]
          } else {
            idx=0;
          }          
          if(cmd.suggest.length > idx) {
            var suggesterName = cmd.suggest[idx];
            suggesters[suggesterName](term,input, value,callback);
          }
        }
      }

      nxshell.prototype.completion = function (term,input,callback) {
          var existingInput = term.get_command().trim();
          var suggestions = [];
          var cmd = this.findBuiltin(existingInput.split(" ")[0]);
          if (cmd) {
            this.cmdParamCompletion(term, cmd, existingInput, callback);
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
              // suggest
              var cmd = input.split(" ")[0];
              // cmds
              for (var idx=0; idx < this.builtins.length; idx++) {
                var cmdOp = this.builtins[idx];
                if (cmdOp.id.indexOf(cmd)==0) {
                  suggestions.push(cmdOp.id);
                }
              }
              // operations
              for (var idx=0; idx < this.automationDefs.operations.length; idx++) {
                var op = this.automationDefs.operations[idx];
                if (op.id.indexOf(cmd)==0) {
                  suggestions.push(op.id);
                }
                if (suggestions.length > 5) {
                  break;
                }
              }
              // chains
              for (var idx=0; idx < this.automationDefs.chains.length; idx++) {
                var op = this.automationDefs.chains[idx];
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

        nxshell.prototype.init = function(term) {
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
                      term.echo("Connected on repository '" + data.repository + "'");
                      term.echo(" current path is " + data.path + "(" + data.uid + ")");
                    })
                    .fail(function(xhr,status) {
                      console.log("Error " + status);
                    })
                    .execute();
        }
        
    };

   nuxeo.DEFAULT_NXSHELL = {
       prompt: 'nx> ',
       name: 'nxshell',
       tabcompletion : true
   }

   nuxeo.shell = function(filter, opts) {
       opts = jQuery.extend({}, nuxeo.DEFAULT_NXSHELL , opts);
       var nx = new nxshell(opts);
       opts.greetings = function() { return nx.nxGreetings()};
       opts.completion =  function (term,input,callback)  { return nx.completion(term,input,callback)};
       opts.onInit = function(term) { return nx.init(term)};
       jQuery(filter).terminal(function (cmd, term) 
                    { 
                      return nx.nxTermHandler(cmd, term)
                    }, opts);
       };
  
})(jQuery,this.nuxeo === undefined ? this.nuxeo = {} : this.nuxeo)

