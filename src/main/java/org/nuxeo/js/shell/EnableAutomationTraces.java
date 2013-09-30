/*
 * (C) Copyright ${year} Nuxeo SA (http://nuxeo.com/) and contributors.
 *
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the GNU Lesser General Public License
 * (LGPL) version 2.1 which accompanies this distribution, and is available at
 * http://www.gnu.org/licenses/lgpl.html
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * Contributors:
 *     <a href="mailto:tdelprat@nuxeo.com">Tiry</a>
 */

package org.nuxeo.js.shell;

import org.nuxeo.ecm.automation.core.Constants;
import org.nuxeo.ecm.automation.core.annotations.Operation;
import org.nuxeo.ecm.automation.core.annotations.OperationMethod;
import org.nuxeo.ecm.automation.core.annotations.Param;
import org.nuxeo.ecm.automation.core.trace.Trace;
import org.nuxeo.ecm.automation.core.trace.TracerFactory;
import org.nuxeo.runtime.api.Framework;

/**
 * @author <a href="mailto:tdelprat@nuxeo.com">Tiry</a>
 */
@Operation(id=EnableAutomationTraces.ID, category=Constants.CAT_EXECUTION, label="EnableAutomationTraces", description="")
public class EnableAutomationTraces {

    public static final String ID = "EnableAutomationTraces";

    @Param(name = "traceKey", required = false)
    protected String traceKey;

    @OperationMethod
    public String run() {

        TracerFactory tracerFactory = Framework.getLocalService(TracerFactory.class);

        Trace trace = tracerFactory.getTrace(traceKey);

        if (trace!=null) {
            return trace.getFormattedText();
        } else {
            return "notrace";
        }
    }

}
