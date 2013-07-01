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
                          name : "TestDocs",
                          properties : "dc:title=Test Docs \ndc:description=Simple container"
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
      AssertThat((doc.uid != null) && (doc.path.indexOf(root.path) == 0),
          "created file with uid : " + doc.uid + " and path "
              + doc.path);
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
                          name : "TestPagination",
                          properties : "dc:title=Test Pagination \ndc:description=Simple container"
                        },
                        input : "doc:/"
                      }
                    });

            createOp.execute(createdOK, failedCB);

          },

          // **********************
          // create child 1
          function testCreateChild1() {
            testCreateChild(1)
          },
          // **********************
          // create child 2
          function testCreateChild2() {
            testCreateChild(2)
          },
          // **********************
          // create child 4
          function testCreateChild3() {
            testCreateChild(3)
          },

          // **********************
          // do query for page 1
          function testQueryPage1() {

            function displayChildren(docs, status, xhr) {
              AssertThat(docs.entries.length == 2,
                  "should have 2 children");
              AssertThat(docs.pageSize == 2,
                  "page Size should be 2");
              AssertThat(docs.pageCount == 2,
                  "should have 2 pages");
              AssertThat(docs.totalSize == 3,
                  "total size should be 3");
            }
            ;

            var getChildren = jQuery()
                .automation(
                    "Document.PageProvider",
                    {
                      automationParams : {
                        params : {
                          query : "select * from Document where ecm:parentId = ?",
                          pageSize : 2,
                          page : 0,
                          queryParams : root.uid
                        }
                      }
                    });

            getChildren.execute(displayChildren, failedCB);
          },

          // **********************
          // do query for page 2
          function testQueryPage2() {

            function displayChildren(docs, status, xhr) {
              AssertThat(docs.entries.length == 1,
                  "should have 1 children on page 2");
              AssertThat(docs.pageSize == 2,
                  "page Size should be 2");
              AssertThat(docs.pageCount == 2,
                  "should have 2 pages");
              AssertThat(docs.totalSize == 3,
                  "total size should be 3");
            }
            ;

            var getChildren = jQuery()
                .automation(
                    "Document.PageProvider",
                    {
                      automationParams : {
                        params : {
                          query : "select * from Document where ecm:parentId = ?",
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

function directBlobUploadTestSuite() {

  var root = {};
  var failedCB = function(xhr, status, msg) {
    alert(msg)
  };

  var suite = new AutomationTestSuite(
      "create documents from Blob using muti-part encoding",
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
                          name : "TestBlobs",
                          properties : "dc:title=Test Blobs \ndc:description=Simple container"
                        },
                        input : "doc:/"
                      }
                    });

            createOp.execute(createdOK, failedCB);

          },
          // **********************
          // create Blob1 (txt)
          function testCreateBlobText() {

            function createdOK(doc, status, xhr) {
              AssertThat(doc.type == 'Note',
                  "created new doc of type " + doc.type);
            }
            ;

            var createOp = jQuery().automation(
                "FileManager.Import", {
                  automationParams : {
                    params : {},
                    context : {
                      currentDocument : root.path
                    }
                  }
                });

            var blob = new Blob([ "some content in plain text" ], {
              "type" : "text/plain"
            });
            createOp.executeMultiPart(blob, "testMe.txt",
                createdOK, failedCB);
          },
          // **********************
          // create Blob2 (bin)
          function testCreateBlobBin() {

            function createdOK(doc, status, xhr) {
              AssertThat(doc.type == 'File',
                  "created new doc of type " + doc.type);
            }
            ;

            var createOp = jQuery().automation(
                "FileManager.Import", {
                  automationParams : {
                    params : {},
                    context : {
                      currentDocument : root.path
                    }
                  }
                });

            var blob = new Blob([ "some fake bin content" ], {
              "type" : "application/something"
            });
            createOp.executeMultiPart(blob, "testBin.bin",
                createdOK, failedCB);
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

function batchBlobUploadTestSuite() {

  var root = {};
  var failedCB = function(xhr, status, msg) {
    alert(msg)
  };

  var createOp;

  var suite = new AutomationTestSuite(
      "create documents from Blob using batch manager",
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
                          name : "TestBlobs",
                          properties : "dc:title=Test Blobs Batch \ndc:description=Simple container"
                        },
                        input : "doc:/"
                      }
                    });

            createOp.execute(createdOK, failedCB);

          },
          // **********************
          // create Blob1 (txt)
          function testUploadBlobText() {

            function uploadedOK(fileIndex, fileObj) {
              AssertThat(fileIndex == 0, "uploaded file1");
              suite.nextTest();
            }
            ;

            createOp = jQuery().automation("FileManager.Import", {
              automationParams : {
                params : {},
                context : {
                  currentDocument : root.path
                }
              }
            });

            var fakeFile = {
              filename : "testMe.txt",
              type : "text/plain",
              size : "26",
              fakeData : 'some content in plain text'
            };
            createOp.uploader().uploadFile(fakeFile, uploadedOK);
          },

          // **********************
          // create Blob2 (bin)
          function testUploadBlobBin() {

            function uploadedOK(fileIndex, fileObj) {
              AssertThat(fileIndex == 1, "uploaded file2");
              suite.nextTest();
            }
            ;

            var fakeFile = {
              filename : "testBin.bin",
              type : "application/something",
              size : "21",
              fakeData : 'some fake bin content'
            };
            createOp.uploader().uploadFile(fakeFile, uploadedOK);
          },

          // **********************
          // do import
          function testDoImport() {

            function createdOK(docs, status, xhr) {
              AssertThat(docs.entries.length == 2,
                  "created 2 docs in one call");
              suite.nextTest();
            }
            ;

            var fakeFile = {
              filename : "testBin.bin",
              type : "application/something",
              size : "21",
              fakeData : 'some fake bin content'
            };
            createOp.uploader().execute(createdOK, failedCB);
          },

          // **********************
          // read children
          function testGetChildren() {

            function displayChildren(docs, status, xhr) {
              AssertThat(docs.entries.length == 2,
                  "check that we have 2 children");
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

function batchBlobUpdateTestSuite() {

  var root = {};
  var child = {};
  var failedCB = function(xhr, status, msg) {
    alert(msg)
  };

  var createOp;

  var suite = new AutomationTestSuite(
      "use batch manager in Blob update operation",
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
                          name : "TestBlobsUpdate",
                          properties : "dc:title=Test Blobs update via Batch \ndc:description=Simple container"
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
              child = doc;
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
          // upload Blob
          function testUploadBlobText() {

            function uploadedOK(fileIndex, fileObj) {
              AssertThat(fileIndex == 0, "uploaded file1");
              suite.nextTest();
            }
            ;

            createOp = jQuery().automation("FileManager.Import", {
              automationParams : {
                params : {},
                context : {
                  currentDocument : root.path
                }
              }
            });

            var fakeFile = {
              name : "testMe.txt",
              type : "text/plain",
              size : "26",
              fakeData : 'some content in plain text'
            };
            createOp.uploader().uploadFile(fakeFile, uploadedOK);
          },

          // **********************
          // update child with Blob from batch
          function testUpdateChild() {

            function updatedOK(doc, status, xhr) {
              AssertThat(
                  doc.properties['dc:description'] == "New Description",
                  "description updated ok "
                      + doc.properties['dc:description']);
              AssertThat(
                      doc.properties['file:content']['name'] == "testMe.txt",
                      "file uploaded ok");
            }
            ;

            var properties = {};
            properties['dc:description'] = 'New Description';
            properties['file:content'] = {
              'upload-batch' : createOp.uploader().batchId,
              'upload-fileId' : '0',
              'type' : 'blob'
            };

            var updateOp = jQuery().automation("Document.Update", {
              documentSchemas : "common,dublincore,file",
              automationParams : {
                params : {
                  save : "true",
                  //properties : JSON.stringify(properties)
                  properties : properties
                },
                input : "doc:" + child.	uid
              }
            });

            updateOp.execute(updatedOK, failedCB);
          } ]);

  return suite;
}

runSuites([ createAndReadDocsTestSuite(), paginationTestSuite(),
    directBlobUploadTestSuite(), batchBlobUploadTestSuite(),
    batchBlobUpdateTestSuite() ]);
