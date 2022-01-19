/**
 * Copyright (C) 2015 The Gravitee team (http://gravitee.io)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package io.gravitee.gateway.debug.flow;

import io.gravitee.gateway.api.ExecutionContext;
import io.gravitee.gateway.api.buffer.Buffer;
import io.gravitee.gateway.core.processor.StreamableProcessor;
import io.gravitee.gateway.debug.policy.impl.DebugPolicy;
import io.gravitee.gateway.flow.policy.PolicyChainFactory;
import io.gravitee.gateway.flow.policy.PolicyResolver;
import io.gravitee.gateway.policy.NoOpPolicyChain;
import io.gravitee.gateway.policy.Policy;
import io.gravitee.gateway.policy.PolicyManager;
import io.gravitee.gateway.policy.StreamType;
import java.util.List;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * @author Yann TAVERNIER (yann.tavernier at graviteesource.com)
 * @author GraviteeSource Team
 */
public class DebugPolicyChainFactory extends PolicyChainFactory {

    public DebugPolicyChainFactory(PolicyManager policyManager) {
        super(policyManager);
    }

    @Override
    public StreamableProcessor<ExecutionContext, Buffer> create(
        List<PolicyResolver.Policy> resolvedPolicies,
        StreamType streamType,
        ExecutionContext context,
        Function<List<Policy>, StreamableProcessor<ExecutionContext, Buffer>> mapper
    ) {
        if (resolvedPolicies.isEmpty()) {
            return new NoOpPolicyChain(context);
        }

        final List<Policy> policies = resolvedPolicies
            .stream()
            .map(
                policy ->
                    new DebugPolicy(
                        streamType,
                        policyManager.create(streamType, policy.getName(), policy.getConfiguration(), policy.getCondition())
                    )
            )
            .filter(Objects::nonNull)
            .collect(Collectors.toList());

        return mapper.apply(policies);
    }
}
