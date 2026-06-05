package com.eqms.equipment;

import java.util.List;

import com.eqms.workflows.WorkflowDefinition;
import com.eqms.workflows.WorkflowTransition;

/**
 * Equipment state machine. Calibration outcomes (PASS/FAIL) may occur from any active state,
 * so each action has three transitions — one per active status.
 *
 * <pre>
 * REGISTERED ─┬─CALIBRATION_PASS─► IN_CALIBRATION
 *             └─CALIBRATION_FAIL─► OUT_OF_CALIBRATION
 *
 * IN_CALIBRATION ─┬─CALIBRATION_PASS─► IN_CALIBRATION  (renewal)
 *                 └─CALIBRATION_FAIL─► OUT_OF_CALIBRATION
 *
 * OUT_OF_CALIBRATION ─┬─CALIBRATION_PASS─► IN_CALIBRATION  (remediation)
 *                     └─CALIBRATION_FAIL─► OUT_OF_CALIBRATION
 *
 * REGISTERED | IN_CALIBRATION | OUT_OF_CALIBRATION ──RETIRE──► RETIRED
 * </pre>
 */
public final class EquipmentWorkflow {

    public static final String RECORD_TYPE = "Equipment";

    public static final String CALIBRATION_PASS = "CALIBRATION_PASS";
    public static final String CALIBRATION_FAIL = "CALIBRATION_FAIL";
    public static final String RETIRE = "RETIRE";

    public static final WorkflowDefinition DEFINITION = new WorkflowDefinition(RECORD_TYPE, List.of(

            WorkflowTransition.builder(CALIBRATION_PASS, "REGISTERED", "IN_CALIBRATION")
                    .requiredAuthority("EQUIPMENT_APPROVE")
                    .build(),
            WorkflowTransition.builder(CALIBRATION_PASS, "IN_CALIBRATION", "IN_CALIBRATION")
                    .requiredAuthority("EQUIPMENT_APPROVE")
                    .build(),
            WorkflowTransition.builder(CALIBRATION_PASS, "OUT_OF_CALIBRATION", "IN_CALIBRATION")
                    .requiredAuthority("EQUIPMENT_APPROVE")
                    .build(),

            WorkflowTransition.builder(CALIBRATION_FAIL, "REGISTERED", "OUT_OF_CALIBRATION")
                    .requiredAuthority("EQUIPMENT_APPROVE")
                    .build(),
            WorkflowTransition.builder(CALIBRATION_FAIL, "IN_CALIBRATION", "OUT_OF_CALIBRATION")
                    .requiredAuthority("EQUIPMENT_APPROVE")
                    .build(),
            WorkflowTransition.builder(CALIBRATION_FAIL, "OUT_OF_CALIBRATION", "OUT_OF_CALIBRATION")
                    .requiredAuthority("EQUIPMENT_APPROVE")
                    .build(),

            WorkflowTransition.builder(RETIRE, "REGISTERED", "RETIRED")
                    .requiredAuthority("EQUIPMENT_APPROVE")
                    .build(),
            WorkflowTransition.builder(RETIRE, "IN_CALIBRATION", "RETIRED")
                    .requiredAuthority("EQUIPMENT_APPROVE")
                    .build(),
            WorkflowTransition.builder(RETIRE, "OUT_OF_CALIBRATION", "RETIRED")
                    .requiredAuthority("EQUIPMENT_APPROVE")
                    .build()
    ));

    private EquipmentWorkflow() {
    }
}
