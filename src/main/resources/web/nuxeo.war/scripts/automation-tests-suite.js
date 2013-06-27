function runCreateAndReadDocsTestSuite() {

  var root = {};
  var children = [];
  var createOp;
  var failedCB = function(xhr, status, msg) {
    alert(msg)
  };

  var suite = new automationTestSuite(
      "create, update and read documents",
      [
          // **********************
          // create root
          function testCreateRoot() {

            function createdOK(doc, status, xhr) {
              root = doc;
              AssertThat(doc.uid, "created container with uid : "
                  + doc.uid);
            }
            ;

            createOp = jQuery()
                .automation(
                    "Document.Create",
                    {
                      automationParams : {
                        params : {
                          type : "Folder",
                          name : "TestFolder1",
                          properties : "dc:title=Test Folder2 \ndc:description=Simple container"
                        },
                        input : "doc:/"
                      }
                    });

            createOp.execute(createdOK, failedCB);

          },

          // **********************
          // create first child
          function testCreateChild1() {

            function createdOK(doc, status, xhr) {
              AssertThat((doc.uid != null)
                  && (doc.path.indexOf(root.path) == 0),
                  "created file with uid : " + doc.uid
                      + " and path " + doc.path);
              children.push(doc);
            }
            ;

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
          },

          // **********************
          // create second child
          function testCreateChild2() {

            function createdOK(doc, status, xhr) {
              AssertThat((doc.uid != null)
                  && (doc.path.indexOf(root.path) == 0),
                  "created file with uid : " + doc.uid
                      + " and path " + doc.path);
              children.push(doc);
            }
            ;

            createOp.addParameter("name", "TestFile2");
            createOp.execute(createdOK, failedCB);

          },

          // **********************
          // update second child
          function testUpdateChild2() {

            function updatedOK(doc, status, xhr) {
              AssertThat(
                  doc.properties['dc:description'] == "Simple File",
                  "description updated ok "
                      + doc.properties['dc:description']);
              AssertThat(
                  doc.properties['dc:subjects'].length == 2,
                  "subject updated ok "
                      + doc.properties['dc:subjects']);
            }
            ;

            var updateOp = jQuery()
                .automation(
                    "Document.Update",
                    {
                      automationParams : {
                        params : {
                          save : "true",
                          properties : "dc:description=Simple File\ndc:subjects=subject1,subject2"
                        },
                        input : "doc:"
                            + children[1].path
                      }
                    });

            updateOp.execute(updatedOK, failedCB);
          },

          // **********************
          // read children
          function testGetChildren() {

            function displayChildren(docs, status, xhr) {
              AssertThat(docs.entries.length == 2, "2 children");
            }
            ;

            var getChildren = jQuery().automation(
                "Document.GetChildren", {
                  automationParams : {
                    input : "doc:" + root.path
                  }
                });

            getChildren.execute(displayChildren, failedCB);
          } ]);

  suite.run();
}

runCreateAndReadDocsTestSuite();
