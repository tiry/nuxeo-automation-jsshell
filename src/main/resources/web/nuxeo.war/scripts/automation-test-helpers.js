QUnit.config.autostart=false;

function AutomationTestSuite(suiteName,testSuite) {

  this.testSuite = testSuite;
  this.suiteName = suiteName;

  if (!this.testSuite) {
    this.testSuite=[];
  }

  AutomationTestSuite.prototype.nextTest = function() {
    var targetTest = this.testSuite.shift();
    console.log("running test " + targetTest.name);
    if (targetTest) {
      targetTest();
    } else {
      conssole.log("no more tests");
    }
  }

  AutomationTestSuite.prototype.newCallback = function(cbFunction) {
    var me = this;
    return function(doc, status, xhr) {
      cbFunction(doc, status, xhr);
      me.nextTest();
    }
  }

  AutomationTestSuite.prototype.addTest = function(testFunction) {
    this.testSuite.push(testFunction);
  }

  AutomationTestSuite.prototype.run = function(cb) {
    console.log("running suite " + this.suiteName);
    var me = this;
    function tearDown() {
      ok(true, "Suite '" + me.suiteName + "' completed OK !");
      console.log("Suite '" + me.suiteName + "' completed OK !");
      me.unPatchAutomation();
      if (cb) {
        cb();
      }
      QUnit.start();
    }
    this.testSuite.push(tearDown);
    this.patchAutomation();
    QUnit.asyncTest(me.suiteName, function() {
      me.nextTest()
    });
  }

  AutomationTestSuite.prototype.patchAutomation = function() {
    if (!AutomationWrapper.prototype.execute) {
      // force loading if not already done
      jQuery().automation();
    }
    var targetExec = AutomationWrapper.prototype.execute;
    if (AutomationWrapper.prototype.executeOld) {
      targetExec = AutomationWrapper.prototype.executeOld;
    }
    var me = this;
    AutomationWrapper.prototype.executeOld = targetExec;
    AutomationWrapper.prototype.execute = function(success, failed, voidOp) {
        this.executeOld(function(doc, status, xhr) {
            success(doc, status, xhr);
            me.nextTest();
          }, failed, voidOp);
    };
  }

  AutomationTestSuite.prototype.unPatchAutomation = function() {
      AutomationWrapper.prototype.execute = AutomationWrapper.prototype.executeOld;
  }
}

AssertThat =  ok;

function runSuites(suites) {

  if (suites.length>0) {
   doRunSuites(suites);
  }
  QUnit.start();
}

function doRunSuites(suites) {

  if (suites.length>0) {
    var targetSuite = suites.shift();
    if (suites.length>0) {
      targetSuite.run(function(){doRunSuites(suites)});
    } else {
      targetSuite.run();
    }
  }
}
