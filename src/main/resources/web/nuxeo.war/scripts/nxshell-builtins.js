
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
              .execute()
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

      ls : {
        impl : function (cmds, term, shell) {
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
           for (var i =0 ; i < docs.entries.length; i++) {
             term.echo(shell.printDoc(docs.entries[i]));
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
    }
  };

  if (nuxeo.shell_builtins === undefined) {
    nuxeo.shell_builtins={};
  }
  nuxeo.shell_builtins = jQuery.extend({}, nuxeo.shell_builtins , cmds);

})(jQuery,this.nuxeo === undefined ? this.nuxeo = {} : this.nuxeo);
