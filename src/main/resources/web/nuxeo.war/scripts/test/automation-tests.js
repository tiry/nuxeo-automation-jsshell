var expect = chai.expect;

describe("Nuxeo automation", function() {
  function failCallback(xhr, status, msg) {
    throw msg
  };

  describe("CRUD", function() {
    var container,
      children = [],
      createOp

    it('create container document', function(done) {
      function containerCreated(doc, status, xhr) {
        container = doc;
        expect(doc.uid).to.exist
        done();
      };

      nuxeo.op("Document.Create", {
        automationParams : {
          params : {
            type : "Folder",
            name : "TestDocs",
            properties : "dc:title=Test Docs \ndc:description=Simple container"
          },
          input : "doc:/"
        }
      }).fail(failCallback).execute({
        done: containerCreated
      });
    })

    it('create first child', function(done) {
      function childCreated(doc, status, xhr) {
        expect(doc.uid).to.exist
        expect(doc.path.indexOf(container.path)).to.equal(0)
        children.push(doc);
        done()
      };
      createOp = nuxeo.op("Document.Create").param("type", "File").param("name", "TestFile1")
        .input("doc:" + container.path).fail(failCallback).execute({ done: childCreated });
    })

    it('create second child', function(done) {
      function childCreated(doc, status, xhr) {
        expect(doc.uid).to.exist
        expect(doc.path.indexOf(container.path)).to.equal(0)
        children.push(doc);
        done();
      };

      createOp.param("name", "TestFile2").execute({ done: childCreated });
    })

    it('update second child', function(done) {
      function childUpdated(doc, status, xhr) {
        expect(doc.properties["dc:description"]).to.equal("Simple File")
        expect(doc.properties["dc:subjects"]).to.have.length(2);
        done()
      };

      nuxeo.op("Document.Update", {
        automationParams : {
          params : {
            save : "true",
            properties : "dc:description=Simple File\ndc:subjects=subject1,subject2"
          },
          input : "doc:" + children[1].path
        }
      }).fail(failCallback).execute({ done: childUpdated });
    })

    it('get children', function(done) {
      function childrenRetrieved(docs, status, xhr) {
        expect(docs.entries).to.have.length(2)
        done()
      };

      nuxeo.op("Document.GetChildren")
        .input("doc:" + container.path).fail(failCallback)
        .execute({ done: childrenRetrieved })
    })
  })

  describe("query and pagination", function() {
    var container

    function createChild(index, done) {
      function childCreated(doc) {
        expect(doc.uid).to.exist
        expect(doc.path.indexOf(container.path)).to.equal(0)
        done()
      }

      nuxeo.op("Document.Create", {
        automationParams : {
          params : {
            type : "File",
            name : "TestFile" + index
          },
          input : "doc:" + container.path
        }
      }).fail(failCallback).execute({ done: childCreated })
    }

    it("create container document", function(done) {
      function containerCreated(doc) {
        container = doc
        expect(doc.uid).to.exist
        done()
      }

      nuxeo.op("Document.Create", {
        automationParams : {
          params : {
            type : "Folder",
            name : "TestPagination",
            properties : "dc:title=Test Pagination \ndc:description=Simple container"
          },
          input : "doc:/"
        }
      }).fail(failCallback).execute({ done: containerCreated })
    })

    it("create first child", function(done) {
      createChild(1, done)
    })

    it("create second child", function(done) {
      createChild(2, done)
    })

    it("create third child", function(done) {
      createChild(3, done)
    })

    it("query first page", function(done) {
      function firstPageRetrieved(docs) {
        expect(docs.entries).to.have.length(2)
        expect(docs.pageSize).to.equal(2)
        expect(docs.pageCount).to.equal(2)
        expect(docs.totalSize).to.equal(3)
        done()
      }

      nuxeo.op("Document.PageProvider").params({
          query: "select * from Document where ecm:parentId = ?",
          pageSize: 2,
          page: 0,
          queryParams: container.uid
        })
        .fail(failCallback).done(firstPageRetrieved)
        .execute()
    })

    it("query second page", function(done) {
      function secondPageRetrieved(docs) {
        expect(docs.entries).to.have.length(1)
        expect(docs.pageSize).to.equal(2)
        expect(docs.pageCount).to.equal(2)
        expect(docs.totalSize).to.equal(3)
        done()
      }

      nuxeo.op("Document.PageProvider").params({
          query: "select * from Document where ecm:parentId = ?",
          pageSize: 2,
          page: 1,
          queryParams: container.uid
        })
        .fail(failCallback).done(secondPageRetrieved)
        .execute()
    })
  })

  describe("blob upload", function() {
    var container

    it("create container document", function(done) {
      function containerCreated(doc) {
        container = doc
        expect(doc.uid).to.exist
        done()
      }

      nuxeo.op("Document.Create", {
        automationParams : {
          params : {
            type : "Folder",
            name : "TestBlobs",
            properties : "dc:title=Test Blobs \ndc:description=Simple container"
          },
          input : "doc:/"
        }
      }).fail(failCallback).execute({ done: containerCreated })
    })

    it("create text blob", function(done) {
      function noteCreated(doc) {
        expect(doc.type).to.equal("Note")
        expect(doc.title).to.equal("testMe.text")
        done()
      };

      var blob = new Blob([ "some content in plain text" ], {
        "type" : "text/plain"
      });
      nuxeo.op("FileManager.Import").context({ currentDocument: container.path })
        .input(blob).fail(failCallback).done(noteCreated).execute({
          filename: "testMe.text"
        })
    })

    it("create binary blob", function(done) {
      function fileCreated(doc) {
        expect(doc.type).to.equal("File")
        expect(doc.title).to.equal("testBin.bin")
        done()
      };

      var blob = new Blob([ "some fake bin content" ], {
        "type" : "application/something"
      });
      nuxeo.op("FileManager.Import").context({ currentDocument: container.path })
        .input(blob).fail(failCallback).done(fileCreated)
        .execute({
          filename: "testBin.bin"
        })
    })

    it("get children", function(done) {
      function childrenRetrieved(docs) {
        expect(docs.entries).to.have.length(2)
        done()
      };

      nuxeo.op("Document.GetChildren").input("doc:" + container.path)
        .fail(failCallback).done(childrenRetrieved).execute()
    })
  })

  describe("batch upload", function() {
    var container,
      importOp

    it("create container document", function(done) {
      function containerCreated(doc) {
        container = doc
        expect(doc.uid).to.exist
        done()
      }

      nuxeo.op("Document.Create", {
        automationParams : {
          params : {
            type : "Folder",
            name : "TestBlobs",
            properties : "dc:title=Test Blobs Batch \ndc:description=Simple container"
          },
          input : "doc:/"
        }
      }).fail(failCallback).execute({ done: containerCreated })
    })

    it("upload text blob", function(done) {
      function blobUploaded(fileIndex, fileObj) {
        expect(fileIndex).to.equal(0)
        done()
      }

      var blob = new Blob([ "some content in plain text" ], {
        "type" : "text/plain"
      });
      blob.name = "testMe.text"

      importOp = nuxeo.op("FileManager.Import").context({ currentDocument: container.path })
        .input(blob).fail(failCallback)
      importOp.uploader().uploadFile(blob, blobUploaded)
    })

    it("upload binary blob", function(done) {
      function blobUploaded(fileIndex, fileObj) {
        expect(fileIndex).to.equal(1)
        done()
      }

      var blob = new Blob([ "some fake bin content" ], {
        "type" : "text/something"
      });
      blob.name = "testBin.bin"

      importOp.uploader().uploadFile(blob, blobUploaded)
    })

    it("import", function(done) {
      function documentsCreated(docs) {
        expect(docs.entries).to.have.length(2)
        done()
      }

      var blob = new Blob([ "some fake bin content" ], {
        "type" : "text/something"
      });
      blob.name = "testBin.bin"

      importOp.uploader().fail(failCallback)
        .execute({ done: documentsCreated })
    })

    it("get children", function(done) {
      function childrenRetrieved(docs) {
        expect(docs.entries).to.have.length(2)
        done()
      };

      nuxeo.op("Document.GetChildren").input("doc:" + container.path)
        .fail(failCallback).done(childrenRetrieved).execute()
    })
  })

  describe("REST tests", function() {
    var doc

    it("fetch domain document", function(done) {
      function checkDocFetcher(data) {
        doc = data;
        expect(doc.uid).to.exist;
        done()
      }

      nuxeo.doc("/default-domain").fetch({done : checkDocFetcher , fail : failCallback});
    })

    it("update fetched document", function(done) {
        function checkDocUpdated(data) {
          doc = data;
          expect(doc.uid).to.exist;
          done()
        }

        doc.update({'dc:source':'automation'});
        expect(doc.getChangeSet,"getChangeSet method should have been added to document object").to.exist;
        expect(doc.getChangeSet(), "getChangeSet method should return a minimal doc").to.exist;
        expect(doc.getChangeSet().properties, "getChangeSet method should return a doc with non  empty properties").to.exist;
        expect(doc.getChangeSet().properties['dc:source'], "getChangeSet should contains an entry for dc:source").to.exist;
        expect(doc.save, "save method should have been added to document object").to.exist;

        doc.save({done : function(data) {
           doc = data;
        }, fail : failCallback});
      })

  })


})




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
              suite.nextTest();
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
              suite.nextTest();
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
                input : "doc:" + child. uid
              }
            });

            updateOp.execute(updatedOK, failedCB);
          } ]);

  return suite;
}
