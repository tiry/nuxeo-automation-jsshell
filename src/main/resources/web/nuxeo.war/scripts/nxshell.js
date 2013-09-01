
function getBuiltIns() {
  return {
      cdCmd : function (cmds, term, shell) {
          if (cmds.length>1) {
            var target = cmds[1];
            if (target.indexOf("/")!=0) {
              target = shell.ctx.path + target;
            }
            nuxeo.operation('Document.Fetch' , { automationParams : {params : { value : target}}})
              .done(function(data, status,xhr) {
                shell.ctx.path = data.path;
                shell.ctx.doc = data;
                term.echo(" current Document is now " + shell.prettyPrint(data));
              })
              .fail(function(xhr,status) {
                term.echo("Error " + status);
              })
              .execute()
          }
        },
      pwdCmd  : function (cmds, term, shell) {
        if (shell.ctx.doc) {
          term.echo(" current Document is " + shell.prettyPrint(shell.ctx.doc));
        } else {
          term.echo(" current Path is " + shell.ctx.path);
        }
      },
      lsCmd : function (cmds, term, shell) {
        var target = shell.ctx.doc.uid;
        // XXX manage path ref !
        var operation = nuxeo.operation('Document.PageProvider' , {
          automationParams: {
            params: {
              query: "select * from Document where ecm:parentId = ? AND ecm:isCheckedInVersion= 0",
              queryParams: target ,
              pageSize: 10,
              page: 0
           }
         }
        });
        var doDisplayPage = function(docs, term) {
           term.echo("  [ display page : " + (docs.pageIndex+1) + "/" + docs.pageCount + "]");
           for (var i =0 ; i < docs.entries.length; i++) {
             term.echo(docs.entries[i].uid);
           }           
           var idx = docs.pageIndex;  
           var prevIdx = idx-1;
           var nextIdx = idx+1;
           if (prevIdx < 0) { prevIdx = 0};
           if (nextIdx > (docs.pageCount-1)) {          
              term.echo("  ( end of listing ) ");
              if (prevIdx>0) {
                displayPage(term, function() { fetchPage(prevIdx, term)}, 
                                  function() { term.echo("finito!!!");}
                            )
              }
           } else {
             term.echo("  ( use arrows to navigate between pages ) ");
             shell.displayPage(term, function() { console.log("fetch " + prevIdx);  fetchPage(prevIdx, term)}, function() { console.log("fetch " + nextIdx);  fetchPage(nextIdx, term)})
           }
        }

        function successCB(data, status,xhr, term) {      
          doDisplayPage(data, term);
        };

        function errorCB(xhr,status, term) {
          term.echo("Error " + status);
        };

        var fetchPage = function (page, term) {
          operation.param("page", page);
          operation.initCallbacks();
          operation.done(function(data, status,xhr) { console.log("fetch done"); successCB(data,status, xhr, term) }).fail(function (xhr, status) { errorCB(xhr, status, term);}).execute();
        }

        fetchPage(0, term);
      }

  }
}


function nxshell() {

  this.automationDefs= [];

  var me = this;

  this.builtins = [ {id : 'ls', impl : function (cmds, term) {return getBuiltIns().lsCmd(cmds, term, me);}},
                    {id : 'pwd', impl : function (cmds, term) {return getBuiltIns().pwdCmd(cmds, term, me);}},
                    {id : 'cd', impl : function (cmds, term) {return getBuiltIns().cdCmd(cmds, term, me);}},
                   ];

  this.ctx = { path : "/" };

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

    // init shell object
    this.fetchAutomationDefs();
    nuxeo.operation('Document.Fetch' , { automationParams : {params : { value : "/"}}})
              .done(function(data, status,xhr) {
                me.ctx.path = data.path;
                me.ctx.doc = data;                
              })
              .fail(function(xhr,status) {
                console.log("Error " + status);
              })
              .execute();

}

(function($) {

   $.fn.nxShell = function ( opts ) {

     this.each(function(){

       var nx = new nxshell();
       var opts = jQuery.extend({}, $.fn.nxShell.defaults, opts);
       opts.greetings = function() { return nx.nxGreetings()};
       opts.completion =  function (term,input,callback)  { return nx.completion(term,input,callback)};
       jQuery(this).terminal(function (cmd, term) { return nx.nxTermHandler(cmd, term)}, opts);
       });
   };

   $.fn.nxShell.defaults = {
       prompt: 'nx> ',
       name: 'nxshell',
       tabcompletion : true
   }

})(jQuery);

