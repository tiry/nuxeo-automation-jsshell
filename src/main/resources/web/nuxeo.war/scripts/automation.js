if (typeof (log) == "undefined") {
  log = function(msg) {
  };
}

function AutomationWrapper(operationId, opts) {
  this.operationId = operationId;
  this.opts = opts;
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

  getTargetUrl: function () {

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
  executeMultiPart : function(blob,filename, successCB, failureCB, voidOp) {

    var automationParams = {params:this.opts.automationParams.params,context: this.opts.automationParams.context};
    var params = new Blob([JSON.stringify(automationParams)],{"type" : "application/json+nxrequest"});
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
  }

  ,
  log : function(msg) {
    if (window.console) {
      // console.log(msg);
    }
  },
  batchExecute : function(batchId, successCB, failureCB, voidOp) {

    if (!voidOp) {
      voidOp = false;
    }
    this.addParameter("operationId", this.operationId);
    this.addParameter("batchId", batchId);

    var targetUrl = this.opts.url;
    var targetUrl = this.opts.url;
    if (targetUrl.indexOf("/", targetUrl.length - 1) == -1) {
      targetUrl = targetUrl + "/";
    }
    if (targetUrl.indexOf('/batch/execute') < 0) {
      targetUrl = targetUrl + 'batch/execute';
    }
    var timeout = 5 + (this.opts.execTimeout / 1000) | 0;
    var documentSchemas = this.opts.documentSchemas;
    var repo = this.opts.repository;
    jQuery.ajax({
      type : 'POST',
      contentType : 'application/json+nxrequest',
      data : JSON.stringify(this.opts.automationParams),
      beforeSend : function(xhr) {
        xhr.setRequestHeader('X-NXVoidOperation', voidOp);
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
        log("Failed to execute");
        if (failureCB) {
          var errorMessage = null;
          if (xhr.response) {
            errorMessage = xhr.response;
            var parsedError = errorMessage;
            try {
              parsedError = JSON.parse(errorMessage);
              errorMessage = parsedError.error
            } catch (err) {
              // NOP
            }
          }
          failureCB(xhr, status, errorMessage);
        } else {
          log("Error, Status =" + status);
        }
      },
      success : function(data, status, xhr) {
        log("Executed OK : " + status);
        if (status == "success") {
          successCB(data, status, xhr);
        } else {
          console.log
          if (failureCB) {
            failureCB(xhr, status, "No Data");
          } else {
            log("Error, Status =" + status);
          }
        }
      }
    })
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
    uploadTimeout : 20*60*1000,
    documentSchemas : "dublincore",
    automationParams : {
      params : {},
      context : {}
    }
  }

})(jQuery);
