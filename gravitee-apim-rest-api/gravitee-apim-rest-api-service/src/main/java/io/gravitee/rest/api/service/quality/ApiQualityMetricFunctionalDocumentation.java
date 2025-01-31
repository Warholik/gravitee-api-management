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
package io.gravitee.rest.api.service.quality;

import io.gravitee.rest.api.model.PageType;
import io.gravitee.rest.api.model.api.ApiEntity;
import io.gravitee.rest.api.model.documentation.PageQuery;
import io.gravitee.rest.api.model.parameters.Key;
import io.gravitee.rest.api.service.PageService;
import org.springframework.beans.factory.annotation.Autowired;

/**
 * @author Nicolas GERAUD (nicolas.geraud at graviteesource.com)
 * @author GraviteeSource Team
 */
public class ApiQualityMetricFunctionalDocumentation implements ApiQualityMetric {

    @Autowired
    PageService pageService;

    @Override
    public Key getWeightKey() {
        return Key.API_QUALITY_METRICS_FUNCTIONAL_DOCUMENTATION_WEIGHT;
    }

    @Override
    public boolean isValid(ApiEntity api, final String environmentId) {
        return (
            pageService
                .search(new PageQuery.Builder().api(api.getId()).published(true).type(PageType.MARKDOWN).build(), environmentId)
                .size() >
            0L
        );
    }
}
