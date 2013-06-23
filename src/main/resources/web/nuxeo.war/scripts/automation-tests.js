function createAndReadDocs() {

  var root = {};
  var children = [];

  var failedCB = function(xhr, status, msg) {
    alert(msg)
  };

  var testSuite = [];

  var nextTest = function() {
    var test = testSuite.shift();
    if (test) {
      test();
    }
  }

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

  var createRoot = function() {
    var createdOK = function(doc, status, xhr) {
      root = doc;
      console.log("created new Folder with uid = " + doc.uid
          + " and title " + doc.title);
      nextTest();
    };

    createOp.execute(createdOK, failedCB);
  };

  testSuite.push(createRoot);

  var createChild1 = function() {

    createdOK = function(doc, status, xhr) {
      console.log(doc);
      console.log("created new File with uid = " + doc.uid);
      children.push(doc);
      nextTest();
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

    createOp.execute(createdOK, failedCB);

  };

  testSuite.push(createChild1);

  var createChild2 = function() {

    createOp.addParameter("name", "TestFile2");
    createOp.execute(createdOK, failedCB);

  };

  testSuite.push(createChild2);

  var updateChild2 = function() {

    var updatedOK = function(doc, status, xhr) {
      console.log(doc);
      console.log("file updated with uid = " + doc.uid);
      nextTest();
    };

    var updateOp = jQuery()
        .automation(
            "Document.Update",
            {
              automationParams : {
                params : {
                  save : "true",
                  properties : "dc:description=Simmple File\ndc:subjects=subject1,subject2"
                },
                input : "doc:" + children[1].path
              }
            });

    updateOp.execute(updatedOK, failedCB);

  };

  testSuite.push(updateChild2);

  var getChildren = function() {

      var displayChildren = function(docs, status, xhr) {
        console.log(docs);
        nextTest();
      };

      var getChildren = jQuery()
          .automation(
              "Document.GetChildren",
              {
                automationParams : {
                  input : "doc:" + root.path
                }
              });

      getChildren.execute(displayChildren, failedCB);

    };

  testSuite.push(getChildren);

  nextTest();

}