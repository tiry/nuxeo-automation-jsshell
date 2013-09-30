package org.nuxeo.js.shell;

import javax.el.ELContext;
import javax.el.ValueExpression;

import org.jboss.el.lang.FunctionMapperImpl;
import org.jboss.seam.el.EL;
import org.nuxeo.ecm.automation.OperationContext;
import org.nuxeo.ecm.automation.core.Constants;
import org.nuxeo.ecm.automation.core.annotations.Context;
import org.nuxeo.ecm.automation.core.annotations.Operation;
import org.nuxeo.ecm.automation.core.annotations.OperationMethod;
import org.nuxeo.ecm.automation.core.annotations.Param;
import org.nuxeo.ecm.automation.jsf.OperationHelper;
import org.nuxeo.ecm.automation.seam.operations.SeamOperationFilter;
import org.nuxeo.ecm.core.api.NuxeoPrincipal;
import org.nuxeo.ecm.platform.actions.seam.SeamActionContext;


/**
 * @author <a href="mailto:tdelprat@nuxeo.com">Tiry</a>
 */
@Operation(id=EvalSeamExpression.ID, category=Constants.CAT_EXECUTION, label="Eval Seam Expression", description="")
public class EvalSeamExpression {

    public static final String ID = "Seam.EvalExpression";

    @Param(name = "conversationId", required = false)
    protected String conversationId;

    @Param(name = "expr", required = false)
    protected String expr;

    @Context
    protected OperationContext context;

    @OperationMethod
    public Object run() {

        boolean initConversation  = false;
        if (!OperationHelper.isSeamContextAvailable()) {
            initConversation = true;
        }

        if (!((NuxeoPrincipal)context.getPrincipal()).isAdministrator()) {
            return "null";
        }

        if (initConversation) {
            SeamOperationFilter.handleBeforeRun(context, conversationId);
        }

        try {

            if (!expr.contains("#{")) {
                expr = "#{" + expr + "}";
            }

            Object result=null;
            // evaluate expression
            ELContext elContext = EL.createELContext(SeamActionContext.EL_RESOLVER, new FunctionMapperImpl());
            ValueExpression ve = SeamActionContext.EXPRESSION_FACTORY.createValueExpression(
                    elContext, expr, Object.class);
            result = ve.getValue(elContext);

            if (result!=null) {
                return result;
            } else {
                return "null";
            }

        } finally {
            if (initConversation) {
                SeamOperationFilter.handleAfterRun(context, conversationId);
            }
        }

    }

}
