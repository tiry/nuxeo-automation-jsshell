
(function(jQuery,nuxeo) {
  var cmds = {
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

  };

  if (nuxeo.shell_builtins === undefined) {
    nuxeo.shell_builtins={};
  }
  nuxeo.shell_builtins = jQuery.extend({}, nuxeo.shell_builtins , cmds);

})(jQuery,this.nuxeo === undefined ? this.nuxeo = {} : this.nuxeo);
