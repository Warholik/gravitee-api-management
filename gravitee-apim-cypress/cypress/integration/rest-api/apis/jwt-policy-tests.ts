/*
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
const jwt = require('jsonwebtoken');
import { API_PUBLISHER_USER } from 'fixtures/fakers/users/users';
import { deleteApi, deployApi, getApiKeys, importCreateApi, startApi, stopApi } from 'commands/management/api-management-commands';
import { publishPlan, closePlan } from 'commands/management/api-plan-management-commands';
import { PlanSecurityType } from 'model/plan';
import { ApiImportFakers } from 'fixtures/fakers/api-imports';
import { ApiImport } from '@model/api-imports';
import { requestGateway } from 'support/common/http.commands';
import * as faker from 'faker';
import { PolicyFakers } from '@fakers/policies';

context('Create and test a JWT policy', () => {
  let createdApi: ApiImport;
  let planId: string;
  const secret = faker.random.alpha({ count: 32 });
  const payload = { exp: 1900000000 };
  const jwtToken = jwt.sign(payload, secret, { noTimestamp: true });

  before(() => {
    const fakeJwtPolicy = PolicyFakers.jwtPolicy(secret);
    const fakeJwtFlow = ApiImportFakers.flow({ pre: [fakeJwtPolicy] });
    const fakePlan = ApiImportFakers.plan({ security: PlanSecurityType.KEY_LESS, flows: [fakeJwtFlow] });
    const fakeApi = ApiImportFakers.api({ plans: [fakePlan] });
    importCreateApi(API_PUBLISHER_USER, fakeApi)
      .ok()
      .its('body')
      .then((api) => {
        createdApi = api;
        planId = createdApi.plans[0].id;
        publishPlan(API_PUBLISHER_USER, createdApi.id, planId).ok();
      })
      .then(() => {
        deployApi(API_PUBLISHER_USER, createdApi.id).ok();
        startApi(API_PUBLISHER_USER, createdApi.id).noContent();
      });
  });

  it('should fail to call API endpoint without JWT token', () => {
    requestGateway(
      {
        method: 'GET',
        url: `${Cypress.env('gatewayServer')}${createdApi.context_path}`,
      },
      {
        validWhen: (response) => {
          return response.status === 401;
        },
      },
    )
      .unauthorized()
      .should((response: Cypress.Response<any>) => {
        expect(response.body.message).to.equal('Unauthorized');
      });
  });

  it('should successfully call API endpoint when using JWT token', () => {
    requestGateway(
      {
        method: 'GET',
        url: `${Cypress.env('gatewayServer')}${createdApi.context_path}`,
        headers: {
          Authorization: `Bearer ${jwtToken}`,
        },
      },
      {
        validWhen: (response) => {
          return response.status === 200;
        },
      },
    ).should((response: Cypress.Response<any>) => {
      expect(response.body).to.have.property('date');
      expect(response.body).to.have.property('timestamp');
    });
  });

  after(() => {
    closePlan(API_PUBLISHER_USER, createdApi.id, planId).ok();
    stopApi(API_PUBLISHER_USER, createdApi.id).noContent();
    deleteApi(API_PUBLISHER_USER, createdApi.id).noContent();
  });
});
