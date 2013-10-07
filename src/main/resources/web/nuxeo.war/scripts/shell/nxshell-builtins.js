
/** contribute shell built-ins commands **/

(function(jQuery,nuxeo) {
  var cmds = {
      cd : {
        impl : function (cmds, term, shell) {
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
              .execute();
          }
        },
        help : "Change current remote directory",
        suggest : ['path']
      },

      pwd  : {
        impl : function (cmds, term, shell) {
          if (shell.ctx.doc) {
            term.echo(" current Document is " + shell.prettyPrint(shell.ctx.doc));
          } else {
            term.echo(" current Path is " + shell.ctx.path);
          }
        },
        help : "Return current remote directory",
        suggest : []
      },

      hide  : {
          impl : function (cmds, term, shell) {
            shell.hide(term);
          },
          help : "Hides current terminal",
          suggest : []
      },

      loadState  : {
          impl : function (cmds, term, shell) {
            shell.loadState();
          },
          help : "load termial state",
          suggest : []
      },

      saveState  : {
          impl : function (cmds, term, shell) {
            shell.saveState();
          },
          help : "save terminal state",
          suggest : []
      },

      js  : {
          impl : function (cmds, term, shell) {
          cmds.shift();
          var jsCommand = cmds.join(" ");
            eval(jsCommand);
            //jQuery.globalEval( jsCommand );
          },
          help : "execute js command",
          suggest : []
      },


      view  : {
        impl : function (cmds, term, shell) {
          var doc = shell.ctx.doc;
          if (cmds.length>1) {
            if(typeof(cmds[1])=='string') {
              var targetPath = shell.resolvePath(cmds[1]);
              var viewCmd = this.impl;
              nuxeo.operation('Document.Fetch' , { documentSchemas : "*", automationParams : {params : { value : targetPath}}})
                .done(function(data, status,xhr) {
                  viewCmd(["view", data], term, shell);
                })
                .fail(function(xhr,status) {
                  term.echo("Error " + status);
                })
                .execute();
                return;
            } else {
              doc = cmds[1];
            }
          }
          if (doc) {
            term.echo("[[i;#DDDDFF;#0] uid   ] : " + doc.uid);
            term.echo("[[i;#DDDDFF;#0] title ] : " + doc.title);
            term.echo("[[i;#DDDDFF;#0] path  ] : " + doc.path);
            term.echo("[[i;#DDDDFF;#0] type  ] : " + doc.type);
            term.echo("[[i;#DDDDFF;#0] state ] : " + doc.state);
            term.echo("[[i;#DDDDFF;#0] properties ] : ");
            var props = [];
            var propNames = Object.keys(doc.properties);
            propNames.sort;
            for (var pIdx = 0; pIdx < propNames.length; pIdx++) {
               var propName = propNames[pIdx];
               var propNameLen = propName.length;
               if (propNameLen > 25) {
                  propNameLen = 25;
               }
               var pad = new Array(26-propNameLen).join(' ');
               var propValue = doc.properties[propName];
               if (typeof(propValue)=='object') {
                  propValue = JSON.stringify(propValue, null, "\t");
               }
               props.push("[[i;#DDDDFF;#0]    " + propName + pad + "] : " + propValue);
            }
            props.sort();
            shell.displayPagesFromList(term, props, 20, 0);
          } else {

          }
        },
        help : "view a Document",
        suggest : ['path']
      },

      ls : {
        impl : function (cmds, term, shell) {
        var target = shell.ctx.doc.uid;
        if (cmds.length>1) {
          if (cmds[1].indexOf("uid:")==0) {
            target = cmds[1].substring(4);
          } else {
            target = shell.resolvePath(cmds[1]);
            var lsCmd = this.impl;
            term.echo(" [[i;#BBBBBB;#0]fetching document at path " + target + "]");
            nuxeo.operation('Document.Fetch' , { automationParams : {params : { value : target}}})
              .done(function(data, status,xhr) {
                lsCmd(["ls", "uid:" + data.uid], term, shell);
              })
              .fail(function(xhr,status) {
                term.echo("Error " + status);
              })
              .execute();
            return;
          }
        };
        var query = "select * from Document where ecm:parentId = '" + target + "' AND ecm:isCheckedInVersion= 0";
        term.echo("listing children for " + target);
        var operation = nuxeo.operation('Document.PageProvider' , {
          automationParams: {
            params: {
              query: query,
              pageSize: 10,
              page: 0
           }
         }
        });
        shell.displayPagesFromOperation(term, operation);
      },
      help : "lists children in current directory",
      suggest : ['path']
    },
    select : {
        impl : function (cmds, term, shell) {
        var query = cmds.join(" ");
        var postCommand;

        if (query.indexOf("|")>0) {
          var parts = query.split("|");
          query = parts[0];
          postCommand = parts[1];
        }

        term.echo("execute " + query);
        var operation = nuxeo.operation('Document.PageProvider' , {
          automationParams: {
            params: {
              query: query,
              pageSize: 10,
              page: 0
           }
         }
        });
        var postProcess;
        if (postCommand) {
          postProcess = function(doc, term, cb) {
            var cmds = postCommand.trim().split(" ");
            var op = shell.findOperation(cmds[0]);
            var opts = {automationParams : { params : {},
                context : {}} };
            for (var i = 1; i < cmds.length; i++) {
                var arg = cmds[i];
                if (arg.indexOf("=")>0) {
                  var param = arg.split("=");
                  opts.automationParams.params[param[0]]=param[1];
                }
            }
            opts.automationParams.input = "doc:" + doc.uid;
            nuxeo.operation(op.id, opts)
            .done(function(data, status,xhr) {
              term.echo("   ... executed " + op.id + "[[bi;#00FF00;#0] ok ]");
              cb();
            })
            .fail(function(xhr,status) {
              term.echo("   ... execution of " + op.id + "[[bi;#FF0000;#0] failed ]");
              cb();
            })
            .execute();
          }
        }
        shell.displayPagesFromOperation(term, operation, postProcess);

      },
      help : "use nxql to search for Document",
      suggest : "nxql"
    }

  };

  if (nuxeo.shell_builtins === undefined) {
    nuxeo.shell_builtins={};
  }
  nuxeo.shell_builtins = jQuery.extend({}, nuxeo.shell_builtins , cmds);

})(jQuery,this.nuxeo === undefined ? this.nuxeo = {} : this.nuxeo);
