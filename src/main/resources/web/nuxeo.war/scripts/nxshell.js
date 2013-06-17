

function nxshell() {

  this.automationDefs= [];

  nxshell.prototype.getAutomationDefs = function () {
      return this.automationDefs;
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

       var op = this.findOperation(cmds[0]);
       if (op) {
         var opts = {automationParams : { params : {},
             context : {}} };
         for (var i = 1; i < cmds.length; i++) {
           var arg = cmds[i];
           if (arg.indexOf("=")>0) {
             var param = arg.split("=");
             console.log(param);
             opts.automationParams.params[param[0]]=param[1];
           }
         }

         var automation = jQuery().automation(op.id , opts);

         var successCB = function(data, status,xhr) {
           term.echo(data);
         };
         var errorCB = function(xhr,status) {
           term.echo("Error " + status);
         };

         automation.execute(successCB, errorCB);

       }
       console.log(cmd);
       term.echo("noop");
    }


  nxshell.prototype.findOperation = function (operationId) {
     console.log("this=", this);
     console.log(this.automationDefs);
     for (var idx=0; idx < this.automationDefs.operations.length; idx++) {
        var op = this.automationDefs.operations[idx];
        if (op.id===operationId) {
          return op;
        }
      }
      return null;
    }

  nxshell.prototype.completion = function (term,input,callback) {
      var existingInput = term.get_command().trim()
      var op = this.findOperation(existingInput.split(" ")[0]);
      var suggestions = [];
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
       callback(suggestions);
      }
    }
}

(function($) {

   $.fn.nxShell = function ( opts ) {

     this.each(function(){

       var nx = new nxshell();
       var opts = jQuery.extend({}, $.fn.nxShell.defaults, opts);
       opts.greetings = function() { return nx.nxGreetings()};
       opts.completion =  function (term,input,callback)  { return nx.completion(term,input,callback)};
       jQuery(this).terminal(function (cmd, term) { return nx.nxTermHandler(cmd, term)}, opts);
       nx.fetchAutomationDefs();
       });
   };

   $.fn.nxShell.defaults = {
       prompt: 'nx> ',
       name: 'nxshell',
       tabcompletion : true
   }

})(jQuery);

