
/** Nuxeo Shell in JS **/

(function(jQuery,nuxeo) {

    if (nuxeo.shell_builtins === undefined) {
      nuxeo.shell_builtins={};
    }

    function nxshell(opts) {

      this.automationDefs= [];
      this.builtins = [];
      this.ctx = { path : "/" };
      this.opts = opts;
      this.terminal = null;

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
            } else if (e.which === 13) { // return
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
        if (list.length <= pageSize) {
          return;
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
              term.pop();
              term.set_prompt(opts.prompt);
          }
        }
        if (offset-pageSize< 0) {
          prevCB = function() {};
        }

        me.displayNavigationPrompt(term, prevCB, nextCB);
      }

      nxshell.prototype.resolvePath = function (path) {
        if (path.indexOf("/")==0) {
          return path;
        }
        var parentPath = this.ctx.path;
        if (this.ctx.doc) {
          if (this.ctx.doc.path) {
            parentPath = this.ctx.doc.path;
          }
        }
        var parents = parentPath.split("/");
        var children = path.split("/");
        for (var idx = 0; idx < children.length; idx++) {
          var segment = children[idx];
          if (segment=="..") {
            parents.pop();
          } else {
            parents.push(segment);
          }
        }
        return parents.join("/");
      }

      nxshell.prototype.nxGreetings = function () {
          var head = "";
          head+="  _   _                      _____ _          _ _  \n";
          head+=" | \\ | |                    / ____| |        | | | \n";
          head+=" |  \\| |_   ___  _____  ___| (___ | |__   ___| | | \n";
          head+=" | . ` | | | \\ \\/ / _ \\/ _ \\\\___ \\| '_ \\ / _ \\ | | \n";
          head+=" | |\\  | |_| |>  <  __/ (_) |___) | | | |  __/ | | \n";
          head+=" |_| \\_|\\__,_/_/\\_\\___|\\___/_____/|_| |_|\\___|_|_| \n";
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

      nxshell.prototype.printDoc = function (doc, relPath) {
        var title = doc.title;
        if (!title) {
          title = "";
        }
        var path = doc.path;
        if (relPath && path.indexOf(relPath)==0) {
          path = path.substring(relPath.length);
          if (path.indexOf("/")==0) {
            path = path.substring(1);
          }
        }
        return "  [[bi;#0000FF;#0] {doc} ] " + path  + " '" + title + "' " + " (" + doc.type + ") [[i;#666666;#0] " + doc.uid + " ]" ;
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
        nxql : function(term, totalInput, value, callback ) {
          var query = term.get_command().trim();
          var suggestions = [];
          if (query.indexOf("*")<0) {
            suggestions.push("*");
          } else {
            if (query.indexOf(" from")<0) {
              suggestions.push("from");
            } else {
              if (query.indexOf(" where ")<0) {
                suggestions.push("Document");
                suggestions.push("File");
                suggestions.push("Folder");
                suggestions.push("Workspace");
                suggestions.push("where");
              } else {
                suggestions.push("and");
                suggestions.push("or");
                suggestions.push("ecm:uuid");
                suggestions.push("ecm:path");
                suggestions.push("ecm:parentId");
                suggestions.push("ecm:isCheckedInVersion");
              }
            }
          }
          callback(suggestions);
        },
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

        if ( Object.prototype.toString.call(cmd.suggest) === '[object Array]' && cmd.suggest.length>0) {
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
        } else if ( typeof(cmd.suggest) == 'string' && cmd.suggest.length>0) {
          suggesters[cmd.suggest](term,input, value,callback);
        }
      }

      nxshell.prototype.completion = function (term,input,callback) {
          var existingInput = term.get_command().trim();
          var suggestions = [];
          var cmd = this.findBuiltin(existingInput.split(" ")[0]);
          if (cmd) {
            shell.cmdParamCompletion(term, cmd, existingInput, callback);
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

        nxshell.prototype.saveState = function() {
          if (window.localStorage) {
            var tState = {};
            tState.termState = this.terminal.export_view();
            tState.ctx = this.ctx;

            console.log(JSON.stringify(tState));

            localStorage.setItem("nxshellState", JSON.stringify(tState));
          }
        }

        nxshell.prototype.loadState = function() {
            if (window.localStorage) {
                var state = localStorage.getItem("nxshellState");
                if (state) {
                  var tState = JSON.parse(state);
                  console.log(tState);
                  this.ctx = tState.ctx;
                  this.terminal.import_view(tState.termState);
                  return true;
                }
            }
            return false;
          }


        nxshell.prototype.init = function(term) {
          // **************************
          // init shell object
          // 1 - init BuiltIns
          initBuiltIns();
          this.terminal = term;
          console.log("built-ins ready");
          // 2 - fetch Operation definitions
          this.fetchAutomationDefs();
          console.log("Automation definition ready");
          // 3 - fetch Root Document to init context
          var root = opts.root;
          if(!root) {
            if (window.ctx) {
              root = window.ctx.currentDocument;
            }
          }
          if (!root) {
            root = "/";
          }

          nuxeo.operation('Document.Fetch' , { automationParams : {params : { value : root}}})
                .done(function(data, status,xhr) {
                  console.log("init root done");
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
       tabcompletion : true,
       width: 'auto',
       height: '400px',
   }

   nuxeo.shell = function(filter, opts) {
       opts = jQuery.extend({}, nuxeo.DEFAULT_NXSHELL , opts);

       var nx = new nxshell(opts);
       opts.greetings = function() { return nx.nxGreetings()};
       opts.completion =  function (term,input,callback)  { return nx.completion(term,input,callback)};
       opts.onInit = function(term) { return nx.init(term)};
       opts.keydown = function (event, term) {
           if (event.keyCode==192) {
             nx.hide(term);
             return false;
           }
         }
       var htmlOb = nuxeo.shell_instance;
       if (htmlOb) {
       if (htmlOb.css("display")=='block') {
         htmlOb.hide('slow');
       } else {
         htmlOb.show('slow');
       }
         return;
       }
       if (filter) {
        htmlOb = jQuery(filter);
        htmlOb.terminal(function (cmd, term)
                {
                  return nx.nxTermHandler(cmd, term)
                }, opts);
       } else {
        // auto-build UI
        var termDiv = jQuery("<div><div>");
        if (opts.width == 'auto') {
          var docWidth = jQuery(document).width();
          opts.width = docWidth-60;
        }

        var fullH = jQuery(window).height()-20;
        var smallH = opts.height;
        if (smallH.indexOf("px")>0) {
          smallH = smallH.substring(0,smallH.length-2);
        }
        smallH = parseInt(smallH);

        termDiv.css("width", opts.width);
        termDiv.css("height", opts.height);
        termDiv.addClass("terminal");
        termDiv.css("float", "left");

        // add bar
        var bar = jQuery("<div></div>");
        bar.addClass("terminalBar");
        bar.css("float", "left");
        bar.css("height", opts.height);
        bar.css("width", "55px");
        bar.css("backgroundColor", "#CCCCCC");

        htmlOb = jQuery("<div></div>");

        htmlOb.css("display","none");
        htmlOb.css("border-style","solid");
        htmlOb.css("border-width","1px");
        htmlOb.css("border-color","#AAAAAA");

        htmlOb.css("height", (termDiv.height()+ 3) + "px" );
        htmlOb.css("width", (termDiv.width()+ 58) + "px" );

        htmlOb.append(termDiv);
        htmlOb.append(bar);

        function mkButton(label, cb) {
          var btn = jQuery("<div>" + label + "</div>");
          btn.css("text-align", "center");
          btn.css("cursor", "pointer");
          btn.css("border-style","outset");
          btn.css("border-width","2px");
          btn.css("border-color","#666666");
          if (cb) {
            btn.click(function (event) {
              cb(event, nx.terminal);
            });
          }
          return btn;
        }

        bar.append(mkButton("Help", function(event, term) {
          term.exec("help", false);
        }));
        bar.append(mkButton("Hide", function(event, term) {
          nx.hide(term);
        }));
        bar.append(mkButton("Popup", function(event, term) {
          window.open("/nuxeo/jsterm_popup.html", '_blank', 'toolbar=0, scrollbars=1, location=0, statusbar=0, menubar=0, resizable=1, dependent=1, width=1024, height=768');
          htmlOb.hide('slow')
        }));
        bar.append(mkButton("PUp", function(event, term) {
          term.scroll("-100");
        }));
        bar.append(mkButton("PDown", function(event, term) {
          term.scroll("100");
        }));

        var fullScreenBtn = mkButton("full", function(event, term) {
           htmlOb.css("height",(fullH +3) + "px" );
           bar.css("height", fullH + "px");
           termDiv.css("height", fullH + "px");
           fullScreenBtn.css("display","none");
           smallScreenBtn.css("display","block");
        });

        var smallScreenBtn = mkButton("small", function(event, term) {
            htmlOb.css("height",(smallH+3) + "px" );
            bar.css("height", smallH + "px");
            termDiv.css("height", smallH + "px");
            fullScreenBtn.css("display","block");
            smallScreenBtn.css("display","none");
         });

        smallScreenBtn.css("display","none");
        bar.append(fullScreenBtn);
        bar.append(smallScreenBtn);

        jQuery("body").prepend(htmlOb);
        htmlOb.show('slow','swing', function() {
          termDiv.terminal(function (cmd, term)
                    {
                      return nx.nxTermHandler(cmd, term)
                    }, opts);
        });
       }
       // setup hide callback
       nuxeo.shell_instance = htmlOb;
       nx.hide = function(term) {
         htmlOb.hide('slow');
         //nx.saveState();
         };
       };
       //nx.loadState();

})(jQuery,this.nuxeo === undefined ? this.nuxeo = {} : this.nuxeo);

// bind keyboard shortcut
jQuery(document).bind("keydown", function(e) {
  if (event.keyCode==192) {
    nuxeo.shell();
    return false;
  }
});
