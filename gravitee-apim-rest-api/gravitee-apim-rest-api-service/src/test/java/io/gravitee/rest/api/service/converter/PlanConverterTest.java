package io.gravitee.rest.api.service.converter;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import io.gravitee.definition.model.DefinitionVersion;
import io.gravitee.definition.model.flow.Flow;
import io.gravitee.repository.management.model.Plan;
import io.gravitee.rest.api.model.PlanEntity;
import io.gravitee.rest.api.model.api.ApiEntity;
import java.util.List;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.InjectMocks;
import org.mockito.junit.MockitoJUnitRunner;

@RunWith(MockitoJUnitRunner.class)
public class PlanConverterTest {

    @InjectMocks
    private PlanConverter planConverter;

    @Test
    public void toPlanEntity_should_convert_plan_to_plan_entity() {
        Plan plan = new Plan();
        plan.setId("123123-1531-4563456166");
        plan.setName("Plan name");
        plan.setDescription("Description for the new plan");
        plan.setValidation(Plan.PlanValidationType.AUTO);
        plan.setType(Plan.PlanType.API);
        plan.setStatus(Plan.Status.STAGING);
        plan.setApi("api1");
        plan.setGeneralConditions("general_conditions");
        plan.setSecurity(Plan.PlanSecurityType.KEY_LESS);

        PlanEntity planEntity = planConverter.toPlanEntity(plan);

        assertEquals(plan.getId(), planEntity.getId());
        assertEquals(plan.getName(), planEntity.getName());
        assertEquals(plan.getDescription(), planEntity.getDescription());
        assertEquals(plan.getValidation().name(), planEntity.getValidation().name());
        assertEquals(plan.getStatus().name(), planEntity.getStatus().name());
        assertEquals(plan.getApi(), planEntity.getApi());
        assertEquals(plan.getGeneralConditions(), planEntity.getGeneralConditions());
        assertEquals(plan.getSecurity().name(), planEntity.getSecurity().name());
    }

    @Test
    public void toPlanEntity_should_get_flows_from_apiEntity_plans() {
        String planId = "my-test-plan";

        Plan plan = new Plan();
        plan.setId(planId);
        plan.setType(Plan.PlanType.API);
        plan.setValidation(Plan.PlanValidationType.AUTO);

        ApiEntity apiEntity = new ApiEntity();
        apiEntity.setGraviteeDefinitionVersion(DefinitionVersion.V2.getLabel());

        Flow flow1 = new Flow();
        Flow flow2 = new Flow();
        Flow flow3 = new Flow();

        io.gravitee.definition.model.Plan plan1 = new io.gravitee.definition.model.Plan();
        plan1.setId(planId);
        plan1.setFlows(List.of(flow1, flow3));

        io.gravitee.definition.model.Plan plan2 = new io.gravitee.definition.model.Plan();
        plan2.setId("another-plan-id");
        plan2.setFlows(List.of(flow2));

        apiEntity.getPlans().add(plan1);
        apiEntity.getPlans().add(plan2);

        PlanEntity planEntity = planConverter.toPlanEntity(plan, apiEntity);

        // should not contains flow 2 cause it belongs to another plan
        assertEquals(2, planEntity.getFlows().size());
        assertTrue(planEntity.getFlows().contains(flow1));
        assertTrue(planEntity.getFlows().contains(flow3));
    }
}
