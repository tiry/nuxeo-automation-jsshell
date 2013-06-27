function createAndReadDocsTestSuite() {

  var root = {};
  var children = [];
  var createOp;
  var failedCB = function(xhr, status, msg) {
    alert(msg)
  };

  var suite = new AutomationTestSuite(
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

  return suite;
}

function paginationTestSuite() {

    var root = {};
    var failedCB = function(xhr, status, msg) {
      alert(msg)
    };

    function testCreateChild(idx) {

        function createdOK(doc, status, xhr) {
          AssertThat((doc.uid != null)
              && (doc.path.indexOf(root.path) == 0),
              "created file with uid : " + doc.uid
                  + " and path " + doc.path);
        }
        ;

        createOp = jQuery().automation("Document.Create", {
          automationParams : {
            params : {
              type : "File",
              name : "TestFile" + idx
            },
            input : "doc:" + root.path
          }
        });

        createOp.execute(createdOK, failedCB);
      }


    var suite = new AutomationTestSuite(
        "create documents and check query and pagination",
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

              var createOp = jQuery()
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
            // create child 1
            function testCreateChild1() { testCreateChild(1) },
            // **********************
            // create child 2
            function testCreateChild2() { testCreateChild(2) },
            // **********************
            // create child 4
            function testCreateChild3() { testCreateChild(3) },

            // **********************
            // do query
            function testQueryPage1() {

              function displayChildren(docs, status, xhr) {
                AssertThat(docs.entries.length == 2, "should have 2 children");
                AssertThat(docs.pageSize == 2, "page Size should be 2");
                AssertThat(docs.pageCount == 2, "should have 2 pages");
                AssertThat(docs.totalSize == 3, "total size should be 3");
              }
              ;

              var getChildren = jQuery().automation(
                  "Document.PageProvider", {
                    automationParams : {
                      params : {
                        query  : "select * from Document where ecm:parentId = ?",
                        pageSize : 2,
                        page : 0,
                        queryParams : root.uid
                      }
                    }
                  });

              getChildren.execute(displayChildren, failedCB);
            },

            function testQueryPage2() {

                function displayChildren(docs, status, xhr) {
                  AssertThat(docs.entries.length == 1, "should have 1 children on page 2");
                  AssertThat(docs.pageSize == 2, "page Size should be 2");
                  AssertThat(docs.pageCount == 2, "should have 2 pages");
                  AssertThat(docs.totalSize == 3, "total size should be 3");
                }
                ;

                var getChildren = jQuery().automation(
                    "Document.PageProvider", {
                      automationParams : {
                        params : {
                          query  : "select * from Document where ecm:parentId = ?",
                          pageSize : 2,
                          page : 1,
                          queryParams : root.uid
                        }
                      }
                    });

                getChildren.execute(displayChildren, failedCB);
              },

            ]);

    return suite;
  }

runSuites([ createAndReadDocsTestSuite(), paginationTestSuite()]);