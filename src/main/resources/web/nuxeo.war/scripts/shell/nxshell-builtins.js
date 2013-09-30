
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
            shell.displayPages(term, props, 20, 0);
          } else {

          }
        },
        help : "view a Document",
        suggest : ['path']
      },

      ls : {
        impl : function (cmds, term, shell) {
        console.log("ls =>", this);
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

        var doDisplayPage = function(docs, term) {
           for (var i =0 ; i < docs.entries.length; i++) {
             term.echo(shell.printDoc(docs.entries[i], shell.ctx.doc.path));
           }
           if (docs.pageCount==1) {
            return;
           }
           var idx = docs.pageIndex;
           var prevIdx = idx-1;
           var nextIdx = idx+1;

           var prevCB = function() { fetchPage(prevIdx, term)};
           var nextCB = function() { fetchPage(nextIdx, term)};

           if (prevIdx < 0) {
            prevCB = function(){};
           };
           if (nextIdx > (docs.pageCount-1)) {
            nextCB = function(){
              term.echo("... no more items to display ... exit");
              // double nesting
              term.pop();
              term.pop();
              term.set_prompt(shell.opts.prompt);
            };
           }
           term.echo("  [ display page : " + (docs.pageIndex+1) + "/" + docs.pageCount + "]");

           shell.displayNavigationPrompt(term,prevCB,nextCB);
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
          operation.done(function(data, status,xhr) { successCB(data,status, xhr, term) }).fail(function (xhr, status) { errorCB(xhr, status, term);}).execute();
        }

        fetchPage(0, term);
      },
      help : "lists children in current directory",
      suggest : ['path']
    },
    select : {
        impl : function (cmds, term, shell) {
        var query = cmds.join(" ");
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

        var doDisplayPage = function(docs, term) {
           for (var i =0 ; i < docs.entries.length; i++) {
             term.echo(shell.printDoc(docs.entries[i], shell.ctx.doc.path));
           }
           if (docs.pageCount==1) {
            return;
           }
           var idx = docs.pageIndex;
           var prevIdx = idx-1;
           var nextIdx = idx+1;

           var prevCB = function() { fetchPage(prevIdx, term)};
           var nextCB = function() { fetchPage(nextIdx, term)};

           if (prevIdx < 0) {
            prevCB = function(){};
           };
           if (nextIdx > (docs.pageCount-1)) {
            nextCB = function(){
              term.echo("... no more items to display ... exit");
              // double nesting
              term.pop();
              term.pop();
              term.set_prompt(shell.opts.prompt);
            };
           }
           term.echo("  [ display page : " + (docs.pageIndex+1) + "/" + docs.pageCount + "]");

           shell.displayNavigationPrompt(term,prevCB,nextCB);
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
          operation.done(function(data, status,xhr) { successCB(data,status, xhr, term) }).fail(function (xhr, status) { errorCB(xhr, status, term);}).execute();
        }

        fetchPage(0, term);
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
