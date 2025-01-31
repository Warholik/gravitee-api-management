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

import { PlanSecurityType, PlanStatus, PlanType, PlanValidation } from '@model/plan';
import { ApiImportFakers } from '@fakers/api-imports';
import { ADMIN_USER, LOW_PERMISSION_USER } from '@fakers/users/users';
import { getApiById, importCreateApi, deleteApi, getApiMetadata, getApiMembers } from '@commands/management/api-management-commands';
import { getPages, getPage } from '@commands/management/api-pages-management-commands';
import { getPlan } from '@commands/management/api-plans-management-commands';
import { ApiMetadataFormat, ApiPageType, ApiPrimaryOwnerType } from '@model/apis';
import { GroupFakers } from '@fakers/groups';
import { createGroup, deleteGroup, getGroup } from '@commands/management/environment-management-commands';
import { createUser, deleteUser, getCurrentUser } from '@commands/management/user-management-commands';
import { createRole, deleteRole } from '@commands/management/organization-configuration-management-commands';
import { ApiImport } from '@model/api-imports';

context('API - Imports', () => {
  describe('Create API from import', () => {
    describe('Create API without ID', () => {
      let apiId;
      const fakeApi = ApiImportFakers.api();

      it('should create API and return generated ID', () => {
        importCreateApi(ADMIN_USER, fakeApi)
          .ok()
          .should((response) => {
            apiId = response.body.id;
            expect(apiId).to.not.be.null;
            expect(apiId).to.not.be.empty;
          });
      });

      it('should get created API with generated ID', () => {
        getApiById(ADMIN_USER, apiId)
          .ok()
          .should((response) => {
            expect(response.body.id).to.eq(apiId);
          });
      });

      it('should delete created API', () => {
        deleteApi(ADMIN_USER, apiId).noContent();
      });
    });

    describe('Create API with specified ID, not yet existing', () => {
      const apiId = '67d8020e-b0b3-47d8-9802-0eb0b357d84c';
      const fakeApi = ApiImportFakers.api({ id: apiId });

      it('should create API and return the specified ID', () => {
        importCreateApi(ADMIN_USER, fakeApi)
          .ok()
          .should((response) => {
            expect(response.body.id).to.eq(apiId);
          });
      });

      it('should get created API with the specified ID', () => {
        getApiById(ADMIN_USER, apiId)
          .ok()
          .should((response) => {
            expect(response.body.id).to.eq(apiId);
          });
      });

      it('should delete created API', () => {
        deleteApi(ADMIN_USER, apiId).noContent();
      });
    });

    describe('Create API with specified ID, already existing', () => {
      const apiId = '67d8020e-b0b3-47d8-9802-0eb0b357d84c';

      const fakeApi1 = ApiImportFakers.api({ id: apiId });
      fakeApi1.proxy.virtual_hosts[0].path = '/testimport1/';

      // api 2 has different context path as api 1, but same ID
      const fakeApi2 = ApiImportFakers.api({ id: apiId });
      fakeApi2.proxy.virtual_hosts[0].path = '/testimport2/';

      it('should create API with the specified ID', () => {
        importCreateApi(ADMIN_USER, fakeApi1)
          .ok()
          .should((response) => {
            expect(response.body.id).to.eq(apiId);
          });
      });

      it('should fail to create API with the same ID', () => {
        importCreateApi(ADMIN_USER, fakeApi2)
          .badRequest()
          .should((response) => {
            expect(response.body.message).to.eq('An api [67d8020e-b0b3-47d8-9802-0eb0b357d84c] already exists.');
          });
      });

      it('should delete created API', () => {
        deleteApi(ADMIN_USER, apiId).noContent();
      });
    });

    describe('Create empty API with an already existing context path', () => {
      const apiId1 = '67d8020e-b0b3-47d8-9802-0eb0b357d84c';
      const fakeApi1 = ApiImportFakers.api({ id: apiId1 });
      fakeApi1.proxy.virtual_hosts[0].path = '/testimport/';

      // api2 has different ID, but same context path as api 1
      const apiId2 = '67d8020e-b0b3-47d8-9802-0eb0b357d84d';
      const fakeApi2 = ApiImportFakers.api({ id: apiId2 });
      fakeApi2.proxy.virtual_hosts[0].path = '/testimport/';

      it('should create API with the specified ID', () => {
        importCreateApi(ADMIN_USER, fakeApi1)
          .ok()
          .should((response) => {
            expect(response.body.id).to.eq(apiId1);
          });
      });

      it('should fail to create API with the same context path', () => {
        importCreateApi(ADMIN_USER, fakeApi2)
          .badRequest()
          .should((response) => {
            expect(response.body.message).to.eq('The path [/testimport/] is already covered by an other API.');
          });
      });

      it('should delete created API', () => {
        deleteApi(ADMIN_USER, apiId1).httpStatus(204);
      });
    });
  });

  describe('Create API from import with pages', () => {
    describe('Create API with one page without an ID', () => {
      const fakeApi = ApiImportFakers.api({ pages: [ApiImportFakers.page()] });

      let apiId, pageId;

      it('should create an API with one page of documentation and return a generated API ID', () => {
        importCreateApi(ADMIN_USER, fakeApi)
          .ok()
          .its('body')
          .should('have.property', 'id')
          .then((id) => {
            apiId = id;
          });
      });

      it('should get API documentation pages from generated API ID', () => {
        getPages(ADMIN_USER, apiId)
          .ok()
          .its('body')
          .should('have.length', 2)
          .its(1)
          .should('have.property', 'id')
          .then((id) => {
            pageId = id;
          });
      });

      it('should get page from generated page ID', () => {
        getPage(ADMIN_USER, apiId, pageId)
          .ok()
          .its('body')
          .should((page) => {
            expect(page.order).to.eq(1);
            expect(page.type).to.eq('MARKDOWN');
            expect(page.name).to.not.be.empty;
            expect(page.content).to.not.be.empty;
            expect(page.published).to.be.false;
            expect(page.homepage).to.be.false;
          });
      });

      it('should delete the API', () => {
        deleteApi(ADMIN_USER, apiId).noContent();
      });
    });

    describe('Create API with one page with an ID', () => {
      const apiId = '08a92f8c-e133-42ec-a92f-8ce13382ec73';
      const pageId = '7b95cbe6-099d-4b06-95cb-e6099d7b0609';
      const generatedPageId = 'c02077fc-7c4d-3c93-8404-6184a6221391';

      const fakePage = ApiImportFakers.page({ id: pageId });
      const fakeApi = ApiImportFakers.api({ id: apiId, pages: [fakePage] });

      it('should create an API with one page of documentation and return specified ID', () => {
        importCreateApi(ADMIN_USER, fakeApi).ok().its('body').should('have.property', 'id').should('eq', apiId);
      });

      it('should get API documentation pages from specified API ID', () => {
        getPages(ADMIN_USER, apiId)
          .ok()
          .its('body')
          .should('have.length', 2)
          .its(1)
          .should('have.property', 'id')
          .should('eq', generatedPageId);
      });

      it('should get API page from generated page ID', () => {
        getPage(ADMIN_USER, apiId, generatedPageId).ok().its('body').should('have.property', 'api').should('eq', apiId);
      });

      it('should delete the API', () => {
        deleteApi(ADMIN_USER, '08a92f8c-e133-42ec-a92f-8ce13382ec73').noContent();
      });
    });

    describe('Create API with more than one system folder', () => {
      const pages = Array.from({ length: 2 }).map(() => ApiImportFakers.page({ type: ApiPageType.SYSTEM_FOLDER }));
      const fakeApi = ApiImportFakers.api({ pages });

      it('should reject the import', () => {
        importCreateApi(ADMIN_USER, fakeApi).badRequest();
      });
    });
  });

  describe('Create API from import with plans', () => {
    describe('Create API with plans without an ID', () => {
      let planId1;
      let planId2;

      const apiId = '08a92f8c-e133-42ec-a92f-8ce13382ec73';
      const fakePlan1 = ApiImportFakers.plan({ name: 'test plan', description: 'this is a test plan' });
      const fakePlan2 = ApiImportFakers.plan({ name: 'test plan', description: 'this is a test plan' });
      const fakeApi = ApiImportFakers.api({ id: apiId, plans: [fakePlan1, fakePlan2] });

      it('should create an API and returns created plans in response', () => {
        importCreateApi(ADMIN_USER, fakeApi)
          .ok()
          .should((response) => {
            expect(response.body.plans).to.be.length(2);
            planId1 = response.body.plans[0].id;
            planId2 = response.body.plans[1].id;
            expect(planId1).to.not.be.null;
            expect(planId1).to.not.be.empty;
            expect(planId2).to.not.be.null;
            expect(planId2).to.not.be.empty;
            expect(planId1).to.not.eq(planId2);
          });
      });

      it('should get plan1 with correct data', () => {
        getPlan(ADMIN_USER, apiId, planId1)
          .ok()
          .should((response) => {
            expect(response.body.id).to.eq(planId1);
            expect(response.body.name).to.eq('test plan');
            expect(response.body.description).to.eq('this is a test plan');
            expect(response.body.validation).to.eq(PlanValidation.AUTO);
            expect(response.body.security).to.eq(PlanSecurityType.KEY_LESS);
            expect(response.body.type).to.eq(PlanType.API);
            expect(response.body.status).to.eq(PlanStatus.STAGING);
            expect(response.body.order).to.eq(0);
          });
      });

      it('should get plan2 with correct data', () => {
        getPlan(ADMIN_USER, apiId, planId2)
          .ok()
          .should((response) => {
            expect(response.body.id).to.eq(planId2);
            expect(response.body.name).to.eq('test plan');
            expect(response.body.description).to.eq('this is a test plan');
            expect(response.body.validation).to.eq(PlanValidation.AUTO);
            expect(response.body.security).to.eq(PlanSecurityType.KEY_LESS);
            expect(response.body.type).to.eq(PlanType.API);
            expect(response.body.status).to.eq(PlanStatus.STAGING);
            expect(response.body.order).to.eq(0);
          });
      });

      it('should delete the API', () => {
        deleteApi(ADMIN_USER, apiId).noContent();
      });
    });

    describe('Create API with plan with ID that does not exist yet', () => {
      let apiId;
      let planId = '08a99999-e999-4999-a999-8ce19992e999';

      const fakePlan = ApiImportFakers.plan({
        id: planId,
        name: 'first test plan',
        description: 'this is the first test plan',
      });
      const fakeApi = ApiImportFakers.api({ plans: [fakePlan] });

      it('should create API, and response should contains created plan with regenerated id', () => {
        importCreateApi(ADMIN_USER, fakeApi)
          .ok()
          .should((response) => {
            apiId = response.body.id;
            expect(response.body.plans).to.have.length(1);
          })
          .then((response) => {
            planId = response.body.plans[0].id;
          });
      });

      it('should get created plan with specified id', () => {
        getPlan(ADMIN_USER, apiId, planId)
          .ok()
          .should((response) => {
            expect(response.body.id).to.eq(planId);
          });
      });

      it('should delete the API', () => {
        deleteApi(ADMIN_USER, apiId).noContent();
      });
    });
  });

  describe('Create API from import with metadata', () => {
    describe('Create API with metadata having key that does not yet exist', () => {
      const apiId = 'bc1287cb-b732-4ba1-b609-1e34d375b585';

      let fakeApi: ApiImport;
      fakeApi = ApiImportFakers.api({
        id: apiId,
        metadata: [
          {
            key: 'team',
            name: 'team',
            format: ApiMetadataFormat.STRING,
            value: 'API Management',
          },
        ],
      });

      it('should create an API with metadata', () => {
        importCreateApi(ADMIN_USER, fakeApi).ok();
      });

      it('should get the created API metadata', () => {
        getApiMetadata(ADMIN_USER, apiId).ok().its('body').its(0).should('deep.equal', {
          key: 'team',
          name: 'team',
          format: ApiMetadataFormat.STRING,
          value: 'API Management',
          apiId: 'bc1287cb-b732-4ba1-b609-1e34d375b585',
        });
      });

      it('should delete the API', () => {
        deleteApi(ADMIN_USER, apiId).noContent();
      });
    });

    describe('Create API with metadata having key already that already exists on an other API', () => {
      const firstApiId = 'b68e1a9c-a344-460d-b0ac-1d86d61b70cf';
      const secondApiId = '5668f9f0-12af-4541-b834-c374faedfb57';

      const firstApi = ApiImportFakers.api({
        id: firstApiId,
        metadata: [
          {
            key: 'team',
            name: 'team',
            format: ApiMetadataFormat.STRING,
            value: 'API Management',
          },
        ],
      });

      const secondApi = ApiImportFakers.api({
        id: secondApiId,
        metadata: [
          {
            key: 'team',
            name: 'team',
            format: ApiMetadataFormat.STRING,
            value: 'Access Management',
          },
        ],
      });

      it('should create a first API with some metadata having a key named "team"', () => {
        importCreateApi(ADMIN_USER, firstApi).ok();
      });

      it('should create a second API with metadata having a key named "team"', () => {
        importCreateApi(ADMIN_USER, secondApi).ok();
      });

      it('should get API metadata for the first API', () => {
        getApiMetadata(ADMIN_USER, firstApiId).ok().its('body').its(0).should('deep.equal', {
          key: 'team',
          name: 'team',
          format: ApiMetadataFormat.STRING,
          value: 'API Management',
          apiId: 'b68e1a9c-a344-460d-b0ac-1d86d61b70cf',
        });
      });

      it('should get API metadata for the second API', () => {
        getApiMetadata(ADMIN_USER, secondApiId).ok().its('body').its(0).should('deep.equal', {
          key: 'team',
          name: 'team',
          format: ApiMetadataFormat.STRING,
          value: 'Access Management',
          apiId: '5668f9f0-12af-4541-b834-c374faedfb57',
        });
      });

      it('should delete the APIs', () => {
        deleteApi(ADMIN_USER, firstApiId).noContent();
        deleteApi(ADMIN_USER, secondApiId).noContent();
      });
    });

    describe('Create API with metadata having an undefined key', () => {
      const apiId = '4d73b285-5b87-4186-928e-f6f6240708f3';

      const fakeApi = ApiImportFakers.api({
        id: apiId,
        metadata: [
          {
            name: 'team',
            format: ApiMetadataFormat.STRING,
            value: 'QA',
          },
        ],
      });

      it('should create an API with some metadata having an empty key', () => {
        importCreateApi(ADMIN_USER, fakeApi).ok();
      });

      it('should get the API metadata', () => {
        getApiMetadata(ADMIN_USER, apiId).ok().its('body').its(0).should('deep.equal', {
          name: 'team',
          format: ApiMetadataFormat.STRING,
          value: 'QA',
          apiId: '4d73b285-5b87-4186-928e-f6f6240708f3',
        });
      });

      it('should delete the API', () => {
        deleteApi(ADMIN_USER, apiId).noContent();
      });
    });
  });

  describe('Create API from import with groups', () => {
    describe('Create API with with group name that already exists', () => {
      const apiId = '7ffe12cc-15b9-48ff-b436-0c9bb18b2816';
      const groupName = 'architecture';
      const fakeGroup = GroupFakers.group({ name: groupName });
      const fakeApi = ApiImportFakers.api({ id: apiId, groups: [groupName] });

      let groupId;

      it('should create a group with name "architecture"', () => {
        createGroup(ADMIN_USER, fakeGroup)
          .created()
          .its('body')
          .should((body) => {
            expect(body.name).to.eq('architecture');
          })
          .should('have.property', 'id')
          .then((id) => {
            groupId = id;
          });
      });

      it('should create an API associated to the "architecture" group', () => {
        importCreateApi(ADMIN_USER, fakeApi)
          .ok()
          .its('body')
          .should('have.property', 'groups')
          .should('have.length', 1)
          .its(0)
          .should('eq', groupId);
      });

      it('should delete the group', () => {
        deleteGroup(ADMIN_USER, groupId).noContent();
      });

      it('should delete the API', () => {
        deleteApi(ADMIN_USER, apiId).noContent();
      });
    });

    describe('Create API with with group name that does not exists', () => {
      const apiId = '533efd8a-22e1-4483-a8af-0c24a2abd590';
      const groupName = 'performances';
      const fakeApi = ApiImportFakers.api({ id: apiId, groups: [groupName] });

      let groupId;

      it('should create an API associated to the "performances" group', () => {
        importCreateApi(ADMIN_USER, fakeApi)
          .ok()
          .its('body')
          .should('have.property', 'groups')
          .should('have.length', 1)
          .its(0)
          .then((id) => {
            groupId = id;
          });
      });

      it('should get the created group', () => {
        getGroup(ADMIN_USER, groupId).ok().its('body').should('have.property', 'name').should('eq', 'performances');
      });

      it('should delete the API', () => {
        deleteApi(ADMIN_USER, apiId).noContent();
      });

      it('should delete the group', () => {
        deleteGroup(ADMIN_USER, groupId).noContent();
      });
    });
  });

  describe('Create API form import with members', () => {
    describe('Create API with member (member role is specified by id)', () => {
      const apiId = '533efd8a-22e1-4483-a8af-0c24a2abd590';
      let member;
      let primaryOwner;
      let roleName = 'MY_TEST_ROLE';
      let roleId;

      it('should create user (future member)', () => {
        createUser(ADMIN_USER, ApiImportFakers.user())
          .ok()
          .then((response) => {
            member = response.body;
          });
      });

      it('should create user (future primary owner)', () => {
        createUser(ADMIN_USER, ApiImportFakers.user())
          .ok()
          .then((response) => {
            primaryOwner = response.body;
          });
      });

      it('should create role', () => {
        createRole(ADMIN_USER, ApiImportFakers.role({ name: roleName }))
          .ok()
          .then((response) => {
            roleId = response.body.id;
          });
      });

      it('should create an API, and associate a member with role, by role id', () => {
        const fakeMember = ApiImportFakers.member({ sourceId: member.email, roles: [roleId] });
        const fakeApi = ApiImportFakers.api({
          id: apiId,
          members: [fakeMember],
          primaryOwner: { id: primaryOwner.id, type: ApiPrimaryOwnerType.USER, email: primaryOwner.email },
        });
        importCreateApi(ADMIN_USER, fakeApi).ok();
      });

      it('should get API members, with a primary owner, and an additional member with associated role', () => {
        getApiMembers(ADMIN_USER, apiId)
          .ok()
          .should((response) => {
            expect(response.body).have.length(2);
            expect(response.body).deep.include({ id: primaryOwner.id, displayName: primaryOwner.displayName, role: 'PRIMARY_OWNER' });
            expect(response.body).deep.include({ id: member.id, displayName: member.displayName, role: 'MY_TEST_ROLE' });
          });
      });

      it('should delete the API', () => {
        deleteApi(ADMIN_USER, apiId).noContent();
      });

      it('should delete role', () => {
        deleteRole(ADMIN_USER, roleName).noContent();
      });

      it('should delete member user', () => {
        deleteUser(ADMIN_USER, member.id).noContent();
      });

      it('should delete primary owner user', () => {
        deleteUser(ADMIN_USER, primaryOwner.id).noContent();
      });
    });

    describe('Create API with member (member role is specified by name)', () => {
      const apiId = '533efd8a-22e1-4483-a8af-0c24a2abd590';
      let member;
      let primaryOwner;
      let roleName = 'MY_TEST_ROLE';
      let roleId;

      it('should create user (future member)', () => {
        createUser(ADMIN_USER, ApiImportFakers.user())
          .ok()
          .then((response) => {
            member = response.body;
          });
      });

      it('should create user (future primary owner)', () => {
        createUser(ADMIN_USER, ApiImportFakers.user())
          .ok()
          .then((response) => {
            primaryOwner = response.body;
          });
      });

      it('should create role', () => {
        createRole(ADMIN_USER, ApiImportFakers.role({ name: roleName }))
          .ok()
          .then((response) => {
            roleId = response.body.id;
          });
      });

      it('should create an API, and associate a member with role, by role name', () => {
        const fakeMember = ApiImportFakers.member({ sourceId: member.email, role: 'MY_TEST_ROLE' });
        const fakeApi = ApiImportFakers.api({
          id: apiId,
          members: [fakeMember],
          primaryOwner: { id: primaryOwner.id, type: ApiPrimaryOwnerType.USER, email: primaryOwner.email },
        });
        importCreateApi(ADMIN_USER, fakeApi).ok();
      });

      it('should get API members, with a primary owner, and an additional member with associated role', () => {
        getApiMembers(ADMIN_USER, apiId)
          .ok()
          .should((response) => {
            expect(response.body).have.length(2);
            expect(response.body).deep.include({ id: primaryOwner.id, displayName: primaryOwner.displayName, role: 'PRIMARY_OWNER' });
            expect(response.body).deep.include({ id: member.id, displayName: member.displayName, role: 'MY_TEST_ROLE' });
          });
      });

      it('should delete the API', () => {
        deleteApi(ADMIN_USER, apiId).noContent();
      });

      it('should delete role', () => {
        deleteRole(ADMIN_USER, roleName).noContent();
      });

      it('should delete member user', () => {
        deleteUser(ADMIN_USER, member.id).noContent();
      });

      it('should delete primary owner user', () => {
        deleteUser(ADMIN_USER, primaryOwner.id).noContent();
      });
    });
  });

  describe('Create API form import with primary owner', () => {
    describe('Create API with primary owner of type "USER", already existing with same id', () => {
      const apiId = '92d900c3-7497-4739-bb98-a8f3615c2773';
      const fakeApi = ApiImportFakers.api({ id: apiId });

      let userId;

      it('should get "user" user ID', () => {
        getCurrentUser(LOW_PERMISSION_USER)
          .ok()
          .its('body')
          .should('have.property', 'id')
          .then((id) => {
            userId = id;
          });
      });

      it('should create an API with user "user" as a primary owner, omitting to use the display name', () => {
        fakeApi.primaryOwner = {
          id: userId,
          type: ApiPrimaryOwnerType.USER,
          displayName: 'Not to be used',
        };

        importCreateApi(ADMIN_USER, fakeApi)
          .ok()
          .its('body')
          .should('have.property', 'owner')
          .should('have.property', 'displayName')
          .should('eq', 'user');
      });

      it('should delete the API', () => {
        deleteApi(ADMIN_USER, apiId).noContent();
      });
    });

    describe('Create API with primary owner of type "USER", not existing with same id', () => {
      const apiId = 'df41e94d-ddd5-47b5-a9d8-973fefc4118f';
      const userId = 'i-do-not-exist';

      const fakeApi = ApiImportFakers.api({ id: apiId });

      it('should create an API, falling back to authenticated user as a primary owner', () => {
        fakeApi.primaryOwner = {
          id: userId,
          type: ApiPrimaryOwnerType.USER,
          displayName: 'Not to be used',
        };

        importCreateApi(ADMIN_USER, fakeApi)
          .ok()
          .its('body')
          .should('have.property', 'owner')
          .should('have.property', 'displayName')
          .should('eq', 'admin');
      });

      it('should delete the API', () => {
        deleteApi(ADMIN_USER, apiId).noContent();
      });
    });

    describe('Create API with primary owner of type "GROUP", already existing with same id', () => {
      const groupName = 'R&D';
      const apiId = '5446abb0-0199-4303-8b1a-fff57b0a9eac';

      // We have to set members to null because of #6808
      const fakeApi = ApiImportFakers.api({ id: apiId, members: null });
      const fakeGroup = GroupFakers.group({ name: groupName });

      let groupId;

      it('should create a group with name "R&D"', () => {
        createGroup(ADMIN_USER, fakeGroup)
          .created()
          .its('body')
          .should((body) => {
            expect(body.name).to.eq('R&D');
          })
          .should('have.property', 'id')
          .then((id) => {
            groupId = id;
          });
      });

      it('should create an API with the "R&D" group as a primary owner, omitting to use the display name', () => {
        fakeApi.primaryOwner = {
          id: groupId,
          type: ApiPrimaryOwnerType.GROUP,
          displayName: 'Not to be used',
        };

        importCreateApi(ADMIN_USER, fakeApi)
          .ok()
          .its('body')
          .should('have.property', 'owner')
          .should('have.property', 'displayName')
          .should('eq', 'R&D');
      });

      it('should delete the API', () => {
        deleteApi(ADMIN_USER, apiId).noContent();
      });

      it('should delete the group', () => {
        deleteGroup(ADMIN_USER, groupId).noContent();
      });
    });

    describe('Create API with primary owner of type "GROUP", not existing with same id', () => {
      const apiId = 'b12f4414-76e1-425c-98e9-6f0c89c5b52d';
      const fakeApi = ApiImportFakers.api({ id: apiId, members: null });
      const groupId = 'i-do-not-exist';

      it('should create an API, falling back to "admin" as an API owner', () => {
        fakeApi.primaryOwner = {
          id: groupId,
          type: ApiPrimaryOwnerType.GROUP,
        };

        importCreateApi(ADMIN_USER, fakeApi)
          .ok()
          .its('body')
          .should('have.property', 'owner')
          .should('have.property', 'displayName')
          .should('eq', 'admin');
      });

      it('should delete the API', () => {
        deleteApi(ADMIN_USER, apiId).noContent();
      });
    });
  });
});
