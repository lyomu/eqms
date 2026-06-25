package com.eqms.changecontrol;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.Getter;
import lombok.Setter;

/** Impact-assessment checkpoint captured during change-control initiation. */
@Embeddable
@Getter
@Setter
public class ChangeImpactTask {

    @Column(name = "checkpoint_no")
    private Integer checkpointNo;

    @Column(name = "impact_area", length = 300)
    private String impactArea;

    @Column(name = "applicability", length = 80)
    private String applicability;

    @Column(name = "proposed_task", columnDefinition = "text")
    private String proposedTask;

    @Column(name = "task_assignee", length = 200)
    private String taskAssignee;

    @Column(name = "remarks", length = 500)
    private String remarks;
}
