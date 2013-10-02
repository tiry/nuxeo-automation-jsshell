package org.nuxeo.js.shell;

import org.nuxeo.ecm.automation.core.Constants;
import org.nuxeo.ecm.automation.core.annotations.Operation;
import org.nuxeo.ecm.automation.core.annotations.OperationMethod;
import org.nuxeo.ecm.automation.core.trace.TracerFactory;
import org.nuxeo.runtime.api.Framework;

@Operation(id=AutomationTraceToggleOperation.ID, category=Constants.CAT_EXECUTION, label="Traces.toggleRecording", description="Toggle Automation call tracing")
public class AutomationTraceToggleOperation {

    public static final String ID = "Traces.toggleRecording";

    @OperationMethod
    public boolean run() {
        TracerFactory tracerFactory = Framework.getLocalService(TracerFactory.class);
        tracerFactory.toggleRecording();
        return tracerFactory.getRecordingState();
    }

}
