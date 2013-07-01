if (typeof (log) == "undefined") {
  log = function(msg) {
  };
}
/*******************************************************
 * Manage upload of files in a queue with a target
 * number of concurrent uploads
 * @param opts
 * @returns
 */
function AutomationUploader(opts) {
  var defaultOpts = {
    numConcurrentUploads : 5,
    // define if upload should be triggered directly
    directUpload : true,
    // update upload speed every second
    uploadRateRefreshTime : 1000,
    handler : {
      // invoked when a new batch is started
      batchStarted : function() {
      },
      // invoked when the upload for given file has been started
      uploadStarted : function(fileIndex, file) {
      },
      // invoked when the upload for given file has been finished
      uploadFinished : function(fileIndex, file, time) {
      },
      // invoked when the progress for given file has changed
      fileUploadProgressUpdated : function(fileIndex, file, newProgress) {
      },
      // invoked when the upload speed of given file has changed
      fileUploadSpeedUpdated : function(fileIndex, file, KBperSecond) {
      },
      // invoked when all files have been uploaded
      batchFinished : function(batchId) {
      }
    }
  };

  this.opts = jQuery.extend({}, defaultOpts, opts);
  this.sendingRequestsInProgress = false;
  this.uploadStack = new Array();
  this.uploadIdx = 0;
  this.nbUploadInprogress = 0;
  this.completedUploads = new Array();
  this.batchId = "batch-" + new Date().getTime() + "-"
      + Math.floor(Math.random() * 100000);
}
AutomationUploader.prototype = {

  uploadFile : function(cfile, callback) {
    if (callback) {
      cfile.callback = callback;
    }
    this.uploadStack.push(cfile);
    if (this.opts.directUpload && !this.sendingRequestsInProgress
        && this.uploadStack.length > 0) {
      this.uploadFiles();
    }
  },

  uploadFiles : function() {

    if (this.nbUploadInprogress >= this.opts.numConcurrentUploads) {
      sendingRequestsInProgress = false;
      log("delaying upload for next file(s) " + this.uploadIdx
          + "+ since there are already " + this.nbUploadInprogress
          + " active uploads");
      return;
    }

    // this.opts.handler.batchStarted();
    sendingRequestsInProgress = true;

    while (this.uploadStack.length > 0) {
      var file = this.uploadStack.shift();
      // create a new xhr object
      var xhr = new XMLHttpRequest();
      var upload = xhr.upload;
      upload.fileIndex = this.uploadIdx + 0;
      upload.fileObj = file;
      upload.downloadStartTime = new Date().getTime();
      upload.currentStart = upload.downloadStartTime;
      upload.currentProgress = 0;
      upload.startData = 0;
      upload.batchId = this.batchId;

      var me = this;

      // add listeners
      upload.addEventListener("progress", function(event) {
        me.progress(event)
      }, false);

      if (file.callback) {
        upload.callback = file.callback;
      }

      // The "load" event doesn't work correctly on WebKit (Chrome,
      // Safari),
      // it fires too early, before the server has returned its response.
      // still it is required for Firefox
      if (navigator.userAgent.indexOf('Firefox') > -1) {
        upload.addEventListener("load", function(event) {
          log("trigger load");
          log(event);
          me.load(event.target)
        }, false);
      }

      // on ready state change is not fired in all cases on webkit
      // - on webkit we rely on progress lister to detected upload end
      // - but on Firefox the event we need it
      xhr.onreadystatechange = (function(xhr) {
        return function() {
          me.readyStateChange(xhr)
        }
      })(xhr);

      // compute timeout in seconds and integer
      uploadTimeoutS = 5 + (this.opts.uploadTimeout / 1000) | 0;

      var targetUrl = this.opts.url;
      if (targetUrl.indexOf("/", targetUrl.length - 1) == -1) {
        targetUrl = targetUrl + "/";
      }
      targetUrl = targetUrl + "batch/upload";

      log("starting upload for file " + this.uploadIdx);
      xhr.open("POST", targetUrl);
      xhr.setRequestHeader("Cache-Control", "no-cache");
      xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
      xhr.setRequestHeader("X-File-Name", encodeURIComponent(file.name));
      xhr.setRequestHeader("X-File-Size", file.size);
      xhr.setRequestHeader("X-File-Type", file.type);
      xhr.setRequestHeader("X-Batch-Id", this.batchId);
      xhr.setRequestHeader("X-File-Idx", this.uploadIdx);

      xhr.setRequestHeader('Nuxeo-Transaction-Timeout', uploadTimeoutS);
      xhr.setRequestHeader("Content-Type", "multipart/form-data");
      this.nbUploadInprogress++;

      this.opts.handler.uploadStarted(this.uploadIdx, file);
      this.uploadIdx++;

      if (file.fakeData) {
        xhr.send(file.fakeData);
      } else {
        xhr.send(file);
      }

      if (this.nbUploadInprogress >= this.opts.numConcurrentUploads) {
        sendingRequestsInProgress = false;
        log("delaying upload for next file(s) " + this.uploadIdx
            + "+ since there are already "
            + this.nbUploadInprogress + " active uploads");
        return;
      }
    }
    sendingRequestsInProgress = false;
  },

  readyStateChange : function(xhr) {
    var upload = xhr.upload;
    log("readyStateChange event on file upload " + upload.fileIndex
        + " (state : " + xhr.readyState + ")");
    if (xhr.readyState == 4) {
      if (xhr.status == 200) {
        this.load(upload);
      } else {
        log("Upload failed, status: " + xhr.status);
      }
    }
  },

  load : function(upload) {
    var fileIdx = upload.fileIndex;
    log("Received loaded event on  file " + fileIdx);
    if (this.completedUploads.indexOf(fileIdx) < 0) {
      this.completedUploads.push(fileIdx);
    } else {
      log("Event already processsed for file " + fileIdx + ", exiting");
      return;
    }
    var now = new Date().getTime();
    var timeDiff = now - upload.downloadStartTime;
    this.opts.handler.uploadFinished(upload.fileIndex, upload.fileObj,
        timeDiff);
    log("upload of file " + upload.fileIndex + " completed");
    if (upload.callback) {
        upload.callback(upload.fileIndex, upload.fileObj,
        timeDiff);
    }
    this.nbUploadInprogress--;
    if (!this.sendingRequestsInProgress && this.uploadStack.length > 0
        && this.nbUploadInprogress < this.opts.numConcurrentUploads) {
      // restart upload
      log("restart pending uploads");
      this.uploadFiles();
    } else if (this.nbUploadInprogress == 0) {
      this.opts.handler.batchFinished(this.batchId);
    }
  },

  progress : function(event) {
    log(event);
    if (event.lengthComputable) {
      var percentage = Math.round((event.loaded * 100) / event.total);
      if (event.target.currentProgress != percentage) {

        log("progress event on upload of file "
            + event.target.fileIndex + " --> " + percentage + "%");

        event.target.currentProgress = percentage;
        this.opts.handler.fileUploadProgressUpdated(
            event.target.fileIndex, event.target.fileObj,
            event.target.currentProgress);

        var elapsed = new Date().getTime();
        var diffTime = elapsed - event.target.currentStart;
        if (diffTime >= this.opts.handler.uploadRateRefreshTime) {
          var diffData = event.loaded - event.target.startData;
          var speed = diffData / diffTime; // in KB/sec

          this.opts.handler
              .fileUploadSpeedUpdated(event.target.fileIndex,
                  event.target.fileObj, speed);

          event.target.startData = event.loaded;
          event.target.currentStart = elapsed;
        }
        if (event.loaded == event.total) {
          log("file " + event.target.fileIndex
              + " detected upload complete");
          // having all the bytes sent to the server does not mean the
          // server did actually receive everything
          // but since load event is not reliable on Webkit we need
          // this
          // window.setTimeout(function(){load(event.target, opts);},
          // 5000);
        } else {
          log("file " + event.target.fileIndex + " not completed :"
              + event.loaded + "/" + event.total);
        }
      }
    }
  }

}

/******************************************
 * Simple wrapper for Automation operation
 */
function AutomationWrapper(operationId, opts) {
  this.operationId = operationId;
  this.opts = opts;
  this.batchUploader = null;
}

AutomationWrapper.prototype = {
  addParameter : function(name, value) {
    this.opts.automationParams.params[name] = value;
    return this;
  }

  ,
  addParameters : function(params) {
    jQuery.extend(this.opts.automationParams.params, params);
    return this;
  }

  ,
  setInput : function(inputValue) {
    this.opts.automationParams.input = inputValue;
    return this;
  }

  ,
  context : function(name, value) {
    this.opts.automationParams.context[name] = value;
    return this;
  }

  ,
  setContext : function(ctxParams) {
    jQuery.extend(this.opts.automationParams.context, ctxParams);
    return this;
  }

  ,
  setTimeout : function(timeout) {
    this.opts.execTimeout = timeout;
    return this;
  }

  ,
  buildXHRParams : function(successCB, failureCB, voidOp) {

    var txTimeout = 5 + (this.opts.execTimeout / 1000) | 0;
    var xhrTimeout = this.opts.uploadTimeout;
    var documentSchemas = this.opts.documentSchemas;
    var repo = this.opts.repository;
    if (!voidOp) {
      voidOp = false;
    }
    return {
      type : 'POST',
      beforeSend : function(xhr) {
        xhr.setRequestHeader('X-NXVoidOperation', voidOp);
        xhr.setRequestHeader('Nuxeo-Transaction-Timeout', txTimeout);
        if (documentSchemas.length > 0) {
          xhr.setRequestHeader('X-NXDocumentProperties',
              documentSchemas);
        }
        if (repo) {
          xhr.setRequestHeader('X-NXRepository', repo);
        }
      },
      timeout : this.opts.execTimeout,
      error : function(xhr, status, e) {
        if (failureCB) {
          failureCB(xhr, status, "No Data");
        } else {
          log("Failed to execute");
          log("Error, Status =" + status);
        }
      },
      success : function(data, status, xhr) {
        log("Executed OK");
        if (status == "success") {
          successCB(data, status, xhr);
        } else {
          if (failureCB) {
            failureCB(xhr, status, "No Data");
          } else {
            log("Error, Status =" + status);
          }
        }
      }
    };

  },

  getTargetUrl : function() {

    var targetUrl = this.opts.url;
    if (targetUrl.indexOf("/", targetUrl.length - 1) == -1) {
      targetUrl = targetUrl + "/";
    }
    targetUrl = targetUrl + this.operationId;

    return targetUrl;
  },

  execute : function(successCB, failureCB, voidOp) {
    var xhrParams = this.buildXHRParams(successCB, failureCB, voidOp);
    xhrParams.url = this.getTargetUrl();
    xhrParams.data = JSON.stringify(this.opts.automationParams);
    xhrParams.contentType = 'application/json+nxrequest';
    jQuery.ajax(xhrParams);
  }

  ,
  executeMultiPart : function(blob, filename, successCB, failureCB, voidOp) {

    var automationParams = {
      params : this.opts.automationParams.params,
      context : this.opts.automationParams.context
    };
    var params = new Blob([ JSON.stringify(automationParams) ], {
      "type" : "application/json+nxrequest"
    });
    var formData = new FormData();
    formData.append("request", params, "request");
    formData.append(filename, blob, filename);

    var xhrParams = this.buildXHRParams(successCB, failureCB, voidOp);
    xhrParams.url = this.getTargetUrl();
    xhrParams.data = formData;
    xhrParams.processData = false;
    xhrParams.contentType = false;

    jQuery.ajax(xhrParams);
  }

  ,
  executeGetBlob : function(successCB, failureCB, blobOp) {

    var targetUrl = this.opts.url;
    if (targetUrl.indexOf("/", targetUrl.length - 1) == -1) {
      targetUrl = targetUrl + "/";
    }
    targetUrl = targetUrl + this.operationId;

    if (!blobOp) {
      voidOp = false;
    }
    var timeout = 5 + (this.opts.execTimeout / 1000) | 0;
    var documentSchemas = this.opts.documentSchemas;
    var repo = this.opts.repository;
    jQuery.ajax({
      type : 'POST',
      contentType : 'application/json+nxrequest',
      data : JSON.stringify(this.opts.automationParams),
      beforeSend : function(xhr) {
        xhr.setRequestHeader('CTYPE_MULTIPART_MIXED', blobOp);
        xhr.setRequestHeader('Nuxeo-Transaction-Timeout', timeout);
        if (documentSchemas.length > 0) {
          xhr.setRequestHeader('X-NXDocumentProperties',
              documentSchemas);
        }
        if (repo) {
          xhr.setRequestHeader('X-NXRepository', repo);
        }
      },
      url : targetUrl,
      timeout : this.opts.execTimeout,
      error : function(xhr, status, e) {
        if (failureCB) {
          failureCB(xhr, status, "No Data");
        } else {
          log("Failed to execute");
          log("Error, Status =" + status);
        }
      },
      success : function(data, status, xhr) {
        log("Executed OK");
        if (status == "success") {
          successCB(data, status, xhr);
        } else {
          if (failureCB) {
            failureCB(xhr, status, "No Data");
          } else {
            log("Error, Status =" + status);
          }
        }
      }
    })
  },

  uploader : function() {
    var me = this;
    if (!this.batchUploader) {
      this.batchUploader = new AutomationUploader(this.opts);
      var bid = this.batchUploader.batchId;
      this.batchUploader.execute = function (successCB, failureCB, voidOp) {
        return me.batchExecute(bid, successCB, failureCB, voidOp);
      }
    }
    return this.batchUploader;
  },

  batchExecute : function(batchId, successCB, failureCB, voidOp) {

    if (!voidOp) {
      voidOp = false;
    }
    this.addParameter("operationId", this.operationId);
    this.addParameter("batchId", batchId);

    var xhrParams = this.buildXHRParams(successCB, failureCB, voidOp);

    var targetUrl = this.opts.url;
    if (targetUrl.indexOf("/", targetUrl.length - 1) == -1) {
      targetUrl = targetUrl + "/";
    }
    if (targetUrl.indexOf('/batch/execute') < 0) {
      targetUrl = targetUrl + 'batch/execute';
    }

    xhrParams.url = targetUrl;
    xhrParams.data = JSON.stringify(this.opts.automationParams);
    xhrParams.contentType = 'application/json+nxrequest';
    jQuery.ajax(xhrParams);
  }

};

(function($) {

  $.fn.automation = function(operationId, options) {
    var opts = jQuery.extend({}, $.fn.automation.defaults, options);
    return new AutomationWrapper(operationId, opts);
  }

  $.fn.automation.defaults = {
    url : nxContextPath + "/site/automation",
    execTimeout : 30000,
    uploadTimeout : 20 * 60 * 1000,
    documentSchemas : "dublincore",
    automationParams : {
      params : {},
      context : {}
    }
  }

})(jQuery);
