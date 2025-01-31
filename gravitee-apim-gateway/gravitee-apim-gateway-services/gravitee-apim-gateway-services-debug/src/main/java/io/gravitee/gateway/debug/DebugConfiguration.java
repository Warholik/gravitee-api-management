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
package io.gravitee.gateway.debug;

import io.gravitee.gateway.debug.vertx.VertxDebugService;
import io.gravitee.gateway.handlers.api.ApiContextHandlerFactory;
import io.gravitee.gateway.handlers.api.definition.Api;
import io.gravitee.gateway.reactor.handler.EntrypointResolver;
import io.gravitee.gateway.reactor.handler.ReactorHandlerFactory;
import io.gravitee.gateway.reactor.handler.ReactorHandlerFactoryManager;
import io.gravitee.gateway.reactor.handler.ReactorHandlerRegistry;
import io.gravitee.gateway.reactor.handler.impl.DefaultEntrypointResolver;
import io.gravitee.gateway.reactor.handler.impl.DefaultReactorHandlerRegistry;
import io.gravitee.node.api.Node;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DebugConfiguration {

    private final ApplicationContext applicationContext;

    private final Node node;

    private final io.gravitee.node.api.configuration.Configuration configuration;

    public DebugConfiguration(
        ApplicationContext applicationContext,
        Node node,
        io.gravitee.node.api.configuration.Configuration configuration
    ) {
        this.applicationContext = applicationContext;
        this.node = node;
        this.configuration = configuration;
    }

    @Bean
    public VertxDebugService vertxDebugService() {
        return new VertxDebugService();
    }

    @Bean
    @Qualifier("debugReactorHandlerFactory")
    public ReactorHandlerFactory<Api> reactorHandlerFactory() {
        return new ApiContextHandlerFactory(applicationContext.getParent(), configuration, node);
    }

    @Bean
    @Qualifier("debugReactorHandlerFactoryManager")
    public ReactorHandlerFactoryManager reactorHandlerFactoryManager(
        @Qualifier("debugReactorHandlerFactory") ReactorHandlerFactory reactorHandlerFactory
    ) {
        return new ReactorHandlerFactoryManager(reactorHandlerFactory);
    }

    @Bean
    @Qualifier("debugReactorHandlerRegistry")
    public ReactorHandlerRegistry reactorHandlerRegistry(ReactorHandlerFactoryManager reactorHandlerFactoryManager) {
        return new DefaultReactorHandlerRegistry(reactorHandlerFactoryManager);
    }

    @Bean
    @Qualifier("debugEntryPointResolver")
    public EntrypointResolver reactorHandlerResolver(
        @Qualifier("debugReactorHandlerRegistry") ReactorHandlerRegistry reactorHandlerRegistry
    ) {
        return new DefaultEntrypointResolver(reactorHandlerRegistry);
    }
}
