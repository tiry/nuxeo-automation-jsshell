QUnit.config.autostart=false;

function AutomationTestSuite(suiteName,testSuite) {

  this.testSuite = testSuite;
  this.suiteName = suiteName;

  if (!this.testSuite) {
    this.testSuite=[];
  }

  AutomationTestSuite.prototype.nextTest = function() {
    var targetTest = this.testSuite.shift();
    if (targetTest) {
      console.log("running test " + targetTest.name);
      targetTest();
    } else {
      console.log("no more tests");
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

    var targetExecMP = AutomationWrapper.prototype.executeMultiPart;
    if (AutomationWrapper.prototype.executeMultiPartOld) {
      targetExecMP = AutomationWrapper.prototype.executeMultiPartOld;
    }
    AutomationWrapper.prototype.executeMultiPartOld = targetExecMP;
    AutomationWrapper.prototype.executeMultiPart = function(blob, filename, success, failed, voidOp) {
        this.executeMultiPartOld(blob, filename, function(doc, status, xhr) {
            success(doc, status, xhr);
            me.nextTest();
          }, failed, voidOp);
    };

    /*
    var targetExecBatch = AutomationWrapper.prototype.batchExecute;
    if (AutomationWrapper.prototype.batchExecuteOld) {
      targetExecBatch = AutomationWrapper.prototype.batchExecuteOld;
    }
    AutomationWrapper.prototype.batchExecuteOld = targetExecBatch;
    AutomationWrapper.prototype.batchExecute = function(batchId, success, failed, voidOp) {
        this.batchExecuteOld(batchId, function(doc, status, xhr) {
            success(doc, status, xhr);
            me.nextTest();
          }, failed, voidOp);
    };*/

  }

  AutomationTestSuite.prototype.unPatchAutomation = function() {
      AutomationWrapper.prototype.execute = AutomationWrapper.prototype.executeOld;
      AutomationWrapper.prototype.executeMultiPart = AutomationWrapper.prototype.executeMultiPartOld;
      //AutomationWrapper.prototype.batchExecute = AutomationWrapper.prototype.batchExecuteOld;
  }
}

// alias
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
