
function automationTestSuite(suiteName,testSuite) {

  this.testSuite = testSuite;
  this.suiteName = suiteName;

  if (!this.testSuite) {
    this.testSuite=[];
  }

  automationTestSuite.prototype.nextTest = function() {
    var targetTest = this.testSuite.shift();
    console.log("running test " + targetTest.name);
    if (targetTest) {
      targetTest();
    }
  }

  automationTestSuite.prototype.newCallback = function(cbFunction) {
    var me = this;
    return function(doc, status, xhr) {
      cbFunction(doc, status, xhr);
      me.nextTest();
    }
  }

  automationTestSuite.prototype.addTest = function(testFunction) {
    this.testSuite.push(testFunction);
  }

  automationTestSuite.prototype.run = function() {
    console.log("running suite " + this.suiteName);
    var me = this;
    function tearDown() {
      ok(true, "Suite '" + me.suiteName + "' completed OK !");
      me.unPatchAutomation();
      start();
    }
    this.testSuite.push(tearDown);
    this.patchAutomation();
    asyncTest(me.suiteName, function() {
      me.nextTest()
    });
  }

  automationTestSuite.prototype.patchAutomation = function() {
    if (!AutomationWrapper.prototype.execute) {
      // force loading if not already done
      jQuery().automation();
    }
    var targetExec = AutomationWrapper.prototype.execute;
    var me = this;
    AutomationWrapper.prototype.executeOld = targetExec;
    AutomationWrapper.prototype.execute = function(success, failed, voidOp) {
        this.executeOld(function(doc, status, xhr) {
            success(doc, status, xhr);
            me.nextTest();
          }, failed, voidOp);
    };
  }

  automationTestSuite.prototype.unPatchAutomation = function() {
      AutomationWrapper.prototype.execute = AutomationWrapper.prototype.executeOld;
  }
}

AssertThat =  ok;
