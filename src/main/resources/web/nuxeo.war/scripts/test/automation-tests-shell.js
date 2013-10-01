// new Reporter for Mocha
function NxReporter(runner, term) {
  var passes = 0;
  var failures = 0;

  runner.on('pass', function(test){
    passes++;
    term.echo('[[b;#00FF00;#0] pass: ]' + test.fullTitle());
  });

  runner.on('fail', function(test, err){
    failures++;
    term.echo('[[b;#FF0000;#0] fail: ]' + test.fullTitle() + "[[i;#FF0000;#0]" + err.message + "]");
  });

  runner.on('end', function(){
    if (failures==0) {
      term.echo('[[b;#00FF00;#0] COMPLETED ] ' + passes + " / " + (passes + failures));
    } else {
      term.echo('[[b;#FFFF00;#0] FAILED: ] ' + passes + " / " + (passes + failures));
    }
  });
}

// new test command

/** contribute shell built-ins commands **/

(function(jQuery,nuxeo) {
  var cmds = {
      tests  : {
          impl : function (cmds, term, shell) {
            mocha.checkLeaks();
            mocha.reporter(function(reporter){NxReporter(reporter, term);});
            mocha.globals(['jQuery']);
            mocha.run();
          },
          help : "Run Automation units tests",
          suggest : []
      },
      testsGUI  : {
          impl : function (cmds, term, shell) {
              window
              .open(
                  "/nuxeo/automation-tests.html",
                  '_blank',
                  'toolbar=0, scrollbars=1, location=0, statusbar=0, menubar=0, resizable=1, dependent=1, width=1024, height=768');
          },
          help : "Run Automation units tests via GUI",
          suggest : []
      }
  };

  if (nuxeo.shell_builtins === undefined) {
    nuxeo.shell_builtins={};
  }
  nuxeo.shell_builtins = jQuery.extend({}, nuxeo.shell_builtins , cmds);

})(jQuery,this.nuxeo === undefined ? this.nuxeo = {} : this.nuxeo);
