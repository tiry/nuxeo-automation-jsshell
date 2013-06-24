function automationTestSuite(suiteName) {

  this.testSuite = [];
  this.suiteName = suiteName;

  automationTestSuite.prototype.nextTest = function() {
    var targetTest = this.testSuite.shift();
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
    var me = this;
    var finish = function() {
      ok(true, "Suite '" + me.suiteName + "' completed OK !");
      start();
    }
    this.testSuite.push(finish);
    asyncTest(me.suiteName, function() {
      me.nextTest()
    });
  }
}

function runCreateAndReadDocsTestSuite() {

  var root = {};
  var children = [];

  var failedCB = function(xhr, status, msg) {
    alert(msg)
  };

  var suite = new automationTestSuite("create, update and read documents");

  var createOp = jQuery()
      .automation(
          "Document.Create",
          {
            automationParams : {
              params : {
                type : "Folder",
                name : "TestFolder1",
                properties : "dc:title=Test Folder2 \ndc:description=Simmple container"
              },
              input : "doc:/"
            }
          });

  // **********************
  // create root
  var testCreateRoot = function() {
    var createdOK = function(doc, status, xhr) {
      root = doc;
      ok(doc.uid, "created container with uid : " + doc.uid);
    };

    createOp.execute(suite.newCallback(createdOK), failedCB);
  };

  // **********************
  // create first child
  var testCreateChild1 = function() {

    createdOK = function(doc, status, xhr) {
      ok((doc.uid != null) && (doc.path.indexOf(root.path) == 0),
          "created file with uid : " + doc.uid + " and path "
              + doc.path);
      children.push(doc);
    };

    createOp = jQuery().automation("Document.Create", {
      automationParams : {
        params : {
          type : "File",
          name : "TestFile1"
        },
        input : "doc:" + root.path
      }
    });

    createOp.execute(suite.newCallback(createdOK), failedCB);
  };

  // **********************
  // create second child
  var testCreateChild2 = function() {

    createOp.addParameter("name", "TestFile2");
    createOp.execute(suite.newCallback(createdOK), failedCB);

  };

  // **********************
  // update second child
  var testUpdateChild2 = function() {

    var updatedOK = function(doc, status, xhr) {
      ok(doc.properties['dc:description'] == "Simple File",
          "description updated ok "
              + doc.properties['dc:description']);
      ok(doc.properties['dc:subjects'].length == 2, "subject updated ok "
          + doc.properties['dc:subjects']);
    };

    var updateOp = jQuery()
        .automation(
            "Document.Update",
            {
              automationParams : {
                params : {
                  save : "true",
                  properties : "dc:description=Simple File\ndc:subjects=subject1,subject2"
                },
                input : "doc:" + children[1].path
              }
            });

    updateOp.execute(suite.newCallback(updatedOK), failedCB);
  };

  // **********************
  // read children
  var testGetChildren = function() {

    var displayChildren = function(docs, status, xhr) {
      ok(docs.entries.length == 2, "2 children");
    };

    var getChildren = jQuery().automation("Document.GetChildren", {
      automationParams : {
        input : "doc:" + root.path
      }
    });

    getChildren.execute(suite.newCallback(displayChildren), failedCB);
  };

  suite.addTest(testCreateRoot);
  suite.addTest(testCreateChild1);
  suite.addTest(testCreateChild2);
  suite.addTest(testUpdateChild2);
  suite.addTest(testGetChildren);
  suite.run();

}

runCreateAndReadDocsTestSuite();
