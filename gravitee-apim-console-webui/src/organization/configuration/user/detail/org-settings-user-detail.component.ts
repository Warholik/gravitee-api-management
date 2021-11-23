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
import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ValidationErrors, ValidatorFn } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { combineLatest, EMPTY, from, Observable, Subject, zip } from 'rxjs';
import { catchError, filter, mergeMap, shareReplay, switchMap, takeUntil, tap } from 'rxjs/operators';
import { isEmpty } from 'lodash';

import {
  OrgSettingsUserDetailAddGroupDialogComponent,
  OrgSettingsUserDetailAddGroupDialogData,
  OrgSettingsUserDetailAddGroupDialogReturn,
} from './org-settings-user-detail-add-group-dialog.component';
import {
  OrgSettingsUserGenerateTokenComponent,
  OrgSettingsUserGenerateTokenDialogData,
} from './tokens/org-settings-user-generate-token.component';

import { UIRouterStateParams } from '../../../../ajs-upgraded-providers';
import { Environment } from '../../../../entities/environment/environment';
import { Group } from '../../../../entities/group/group';
import { User } from '../../../../entities/user/user';
import { EnvironmentService } from '../../../../services-ngx/environment.service';
import { GroupService } from '../../../../services-ngx/group.service';
import { RoleService } from '../../../../services-ngx/role.service';
import { SnackBarService } from '../../../../services-ngx/snack-bar.service';
import { UsersService } from '../../../../services-ngx/users.service';
import {
  GioConfirmDialogComponent,
  GioConfirmDialogData,
} from '../../../../shared/components/gio-confirm-dialog/gio-confirm-dialog.component';
import { GioTableWrapperFilters } from '../../../../shared/components/gio-table-wrapper/gio-table-wrapper.component';
import { gioTableFilterCollection } from '../../../../shared/components/gio-table-wrapper/gio-table-wrapper.util';
import { UserHelper } from '../../../../entities/user/userHelper';
import { Token } from '../../../../entities/user/userTokens';
import { UsersTokenService } from '../../../../services-ngx/users-token.service';

interface UserVM extends User {
  organizationRoles: string;
  avatarUrl: string;
  badgeCSSClass: string;
}

interface EnvironmentDS {
  id: string;
  name?: string;
  description?: string;
  roles: string;
}

interface GroupDS {
  id: string;
  name: string;
}

interface ApiDS {
  id: string;
  version: string;
  visibility: string;
}

interface ApplicationDS {
  id: string;
  name: string;
}

@Component({
  selector: 'org-settings-user-detail',
  template: require('./org-settings-user-detail.component.html'),
  styles: [require('./org-settings-user-detail.component.scss')],
})
export class OrgSettingsUserDetailComponent implements OnInit, OnDestroy {
  user: UserVM;

  organizationRoles$ = this.roleService.list('ORGANIZATION').pipe(shareReplay());
  environmentRoles$ = this.roleService.list('ENVIRONMENT').pipe(shareReplay());
  apiRoles$ = this.roleService.list('API').pipe(shareReplay());
  applicationRoles$ = this.roleService.list('APPLICATION').pipe(shareReplay());

  organizationRolesControl: FormControl;
  environmentsRolesFormGroup: FormGroup;
  groupsRolesFormGroup: FormGroup;

  environmentsTableDS: EnvironmentDS[];
  environmentsTableDisplayedColumns = ['name', 'description', 'roles'];

  groupsTableDS: GroupDS[];
  groupsTableDisplayedColumns = ['name', 'groupAdmin', 'apiRoles', 'applicationRole', 'delete'];

  apisTableDS: ApiDS[];
  apisTableDisplayedColumns = ['name', 'version', 'visibility'];

  applicationsTableDS: ApplicationDS[];
  applicationsTableDisplayedColumns = ['name'];

  tokens: Token[];

  openSaveBar = false;
  invalidStateSaveBar = false;

  private initialTableDS: Record<string, unknown[]> = {};

  private unsubscribe$ = new Subject<boolean>();

  constructor(
    private readonly usersService: UsersService,
    private readonly usersTokenService: UsersTokenService,
    private readonly roleService: RoleService,
    private readonly groupService: GroupService,
    private readonly snackBarService: SnackBarService,
    private readonly environmentService: EnvironmentService,
    private readonly matDialog: MatDialog,
    @Inject(UIRouterStateParams) private readonly ajsStateParams,
  ) {}

  ngOnInit(): void {
    combineLatest([
      this.usersService.get(this.ajsStateParams.userId),
      this.environmentService.list(),
      this.usersService.getUserGroups(this.ajsStateParams.userId),
    ])
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(([user, environments, groups]) => {
        const organizationRoles = user.roles.filter((r) => r.scope === 'ORGANIZATION');
        this.user = {
          ...user,
          organizationRoles: organizationRoles.map((r) => r.name ?? r.id).join(', '),
          avatarUrl: this.usersService.getUserAvatar(this.ajsStateParams.userId),
          badgeCSSClass: UserHelper.getStatusBadgeCSSClass(user),
        };

        this.initOrganizationRolesForm();

        this.environmentsTableDS = environments.map((e) => ({ id: e.id, name: e.name, description: e.description, roles: '' }));

        this.initEnvironmentsRolesForm(environments);

        this.groupsTableDS = groups.map((g) => ({
          id: g.id,
          name: g.name,
        }));

        this.initGroupsRolesForm(groups);
      });

    this.usersService
      .getMemberships(this.ajsStateParams.userId, 'api')
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(({ metadata }) => {
        this.apisTableDS = Object.entries(metadata).map(([apiId, apiMetadata]: [string, any]) => ({
          id: apiId,
          name: apiMetadata.name,
          version: apiMetadata.version,
          visibility: apiMetadata.visibility,
        }));
      });

    this.usersService
      .getMemberships(this.ajsStateParams.userId, 'application')
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(({ metadata }) => {
        this.applicationsTableDS = Object.entries(metadata).map(([applicationId, applicationMetadata]: [string, any]) => ({
          id: applicationId,
          name: applicationMetadata.name,
        }));
      });

    this.usersTokenService
      .getTokens(this.ajsStateParams.userId)
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((response) => {
        this.tokens = response;
      });
  }

  ngOnDestroy() {
    this.unsubscribe$.next(true);
    this.unsubscribe$.complete();
  }

  toggleSaveBar(open?: boolean) {
    this.openSaveBar = open ?? !this.openSaveBar;
  }

  onSaveBarSubmit() {
    let observableToZip: Observable<void>[] = [];

    // Organization
    if (this.organizationRolesControl.dirty) {
      observableToZip.push(
        this.usersService
          .updateUserRoles(this.user.id, 'ORGANIZATION', 'DEFAULT', this.organizationRolesControl.value)
          .pipe(takeUntil(this.unsubscribe$)),
      );
    }

    // Environments
    if (this.environmentsRolesFormGroup.dirty) {
      observableToZip.push(
        from(Object.keys(this.environmentsRolesFormGroup.controls)).pipe(
          mergeMap((envId) => {
            const envRolesControl = this.environmentsRolesFormGroup.get(envId) as FormControl;
            if (envRolesControl.dirty) {
              return this.usersService.updateUserRoles(this.user.id, 'ENVIRONMENT', envId, envRolesControl.value);
            }
            // skip if no change on environment roles
            return EMPTY;
          }),
        ),
      );
    }

    // Groups
    if (this.groupsRolesFormGroup.dirty) {
      observableToZip.push(
        from(Object.keys(this.groupsRolesFormGroup.controls)).pipe(
          mergeMap((groupId) => {
            const groupRolesFormGroup = this.groupsRolesFormGroup.get(groupId) as FormGroup;
            if (groupRolesFormGroup.dirty) {
              const { GROUP, API, APPLICATION } = groupRolesFormGroup.value;

              return this.groupService.addOrUpdateMemberships(groupId, [
                {
                  id: this.user.id,
                  roles: [
                    { scope: 'GROUP' as const, name: GROUP ? 'ADMIN' : '' },
                    { scope: 'API' as const, name: API },
                    { scope: 'APPLICATION' as const, name: APPLICATION },
                  ],
                },
              ]);
            }
            // skip if no change on groups roles
            return EMPTY;
          }),
        ),
      );
    }

    // After all observables emit, emit all success message as an array
    zip(...observableToZip)
      .pipe(
        takeUntil(this.unsubscribe$),
        tap(() => {
          this.snackBarService.success('Roles successfully updated');
        }),
        catchError(({ error }) => {
          this.snackBarService.error(error.message);
          return EMPTY;
        }),
      )
      .subscribe(() => {
        observableToZip = [];
        this.toggleSaveBar(false);
      });
  }

  onResetPassword() {
    this.matDialog
      .open<GioConfirmDialogComponent, GioConfirmDialogData>(GioConfirmDialogComponent, {
        width: '500px',
        data: {
          title: 'Reset user password',
          content: `
          Are you sure you want to reset password of user <strong>${this.user.displayName}</strong> ?
          <br>
          The user will receive an email with a link to set a new password.
          `,
          confirmButton: 'Reset',
        },
        role: 'alertdialog',
        id: 'resetUserPasswordConfirmDialog',
      })
      .afterClosed()
      .pipe(
        takeUntil(this.unsubscribe$),
        filter((confirm) => confirm === true),
        switchMap(() => this.usersService.resetPassword(this.user.id)),
        tap(() => this.snackBarService.success(`The password of user "${this.user.displayName}" has been successfully reset`)),
        catchError(({ error }) => {
          this.snackBarService.error(error.message);
          return EMPTY;
        }),
      )
      .subscribe(() => this.ngOnInit());
  }

  onProcessRegistration(state: 'accept' | 'reject') {
    const wording = {
      accept: {
        content: `Are you sure you want to accept the registration request of <strong>${this.user.displayName}</strong> ?`,
        confirmButton: 'Accept',
        success: `User "${this.user.displayName}" has been accepted`,
      },
      reject: {
        content: `Are you sure you want to reject the registration request of <strong>${this.user.displayName}</strong> ?`,
        confirmButton: 'Reject',
        success: `User "${this.user.displayName}" has been rejected`,
      },
    };

    this.matDialog
      .open<GioConfirmDialogComponent, GioConfirmDialogData>(GioConfirmDialogComponent, {
        width: '500px',
        data: {
          title: 'User registration',
          content: wording[state].content,
          confirmButton: wording[state].confirmButton,
        },
        role: 'alertdialog',
        id: 'userRegistrationConfirmDialog',
      })
      .afterClosed()
      .pipe(
        takeUntil(this.unsubscribe$),
        filter((confirm) => confirm === true),
        switchMap(() => this.usersService.processRegistration(this.user.id, state === 'accept')),
        tap(() => this.snackBarService.success(wording[state].success)),
        catchError(({ error }) => {
          this.snackBarService.error(error.message);
          return EMPTY;
        }),
      )
      .subscribe(() => this.ngOnInit());
  }

  onFiltersChanged(tableDSPropertyKey: string, filters: GioTableWrapperFilters) {
    let initialCollection = this.initialTableDS[tableDSPropertyKey];

    if (!initialCollection) {
      // If no initial collection save the first one
      this.initialTableDS[tableDSPropertyKey] = this[tableDSPropertyKey];
      initialCollection = this[tableDSPropertyKey];
    }

    this[tableDSPropertyKey] = gioTableFilterCollection(initialCollection, filters, {
      searchTermIgnoreKeys: ['id'],
    });
  }

  onSaveBarReset() {
    this.ngOnInit();

    this.toggleSaveBar(false);
  }

  onDeleteGroupClick(group: Group) {
    this.matDialog
      .open<GioConfirmDialogComponent, GioConfirmDialogData>(GioConfirmDialogComponent, {
        width: '500px',
        data: {
          title: 'Delete user form the group',
          content: `Are you sure you want to delete the user from the group <strong>${group.name}</strong> ?`,
          confirmButton: 'Delete',
        },
        role: 'alertdialog',
        id: 'removeGroupMemberConfirmDialog',
      })
      .afterClosed()
      .pipe(
        takeUntil(this.unsubscribe$),
        filter((confirm) => confirm === true),
        switchMap(() => this.groupService.deleteMember(group.id, this.user.id)),
        tap(() => this.snackBarService.success(`"${this.user.displayName}" has been deleted from the group "${group.name}"`)),
        catchError(({ error }) => {
          this.snackBarService.error(error.message);
          return EMPTY;
        }),
      )
      .subscribe(() => this.ngOnInit());
  }

  onAddGroupClicked() {
    this.matDialog
      .open<
        OrgSettingsUserDetailAddGroupDialogComponent,
        OrgSettingsUserDetailAddGroupDialogData,
        OrgSettingsUserDetailAddGroupDialogReturn
      >(OrgSettingsUserDetailAddGroupDialogComponent, {
        width: '500px',
        data: {
          groupIdAlreadyAdded: this.groupsTableDS.map((g) => g.id),
        },
        role: 'alertdialog',
        id: 'addGroupConfirmDialog',
      })
      .afterClosed()
      .pipe(
        takeUntil(this.unsubscribe$),
        filter((groupeAdded) => !isEmpty(groupeAdded)),
        switchMap((groupeAdded) =>
          this.groupService.addOrUpdateMemberships(groupeAdded.groupId, [
            {
              id: this.user.id,
              roles: [
                { scope: 'GROUP' as const, name: groupeAdded.isAdmin ? 'ADMIN' : '' },
                { scope: 'API' as const, name: groupeAdded.applicationRole },
                { scope: 'APPLICATION' as const, name: groupeAdded.applicationRole },
              ],
            },
          ]),
        ),
        tap(() => {
          this.snackBarService.success('Roles successfully updated');
        }),
        catchError(({ error }) => {
          this.snackBarService.error(error.message);
          return EMPTY;
        }),
      )
      .subscribe(() => this.ngOnInit());
  }

  private initOrganizationRolesForm() {
    const organizationRoles = this.user.roles.filter((r) => r.scope === 'ORGANIZATION');

    this.organizationRolesControl = new FormControl({ value: organizationRoles.map((r) => r.id), disabled: this.user.status !== 'ACTIVE' });

    this.organizationRolesControl.valueChanges.pipe(takeUntil(this.unsubscribe$)).subscribe(() => {
      this.toggleSaveBar(true);
    });
  }

  private initEnvironmentsRolesForm(environments: Environment[]) {
    this.environmentsRolesFormGroup = new FormGroup(
      environments.reduce((result, environment) => {
        const userEnvRoles = this.user.envRoles[environment.id] ?? [];

        return {
          ...result,
          [environment.id]: new FormControl({ value: userEnvRoles.map((r) => r.id), disabled: this.user.status !== 'ACTIVE' }),
        };
      }, {}),
    );

    this.environmentsRolesFormGroup.valueChanges.pipe(takeUntil(this.unsubscribe$)).subscribe(() => {
      this.toggleSaveBar(true);
    });
  }

  private initGroupsRolesForm(groups: Group[]) {
    const leastOneGroupRoleIsRequiredValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
      const groupRolesFormGroup = control as FormGroup;

      const GROUP = groupRolesFormGroup.get('GROUP').value;
      const API = groupRolesFormGroup.get('API').value;
      const APPLICATION = groupRolesFormGroup.get('APPLICATION').value;

      if (GROUP || API || APPLICATION) {
        return null;
      }

      return {
        leastOneIsRequired: true,
      };
    };

    this.groupsRolesFormGroup = new FormGroup({
      ...groups.reduce((result, group) => {
        return {
          ...result,
          [group.id]: new FormGroup(
            {
              GROUP: new FormControl({ value: group.roles['GROUP'], disabled: this.user.status !== 'ACTIVE' }),
              API: new FormControl({ value: group.roles['API'], disabled: this.user.status !== 'ACTIVE' }),
              APPLICATION: new FormControl({ value: group.roles['APPLICATION'], disabled: this.user.status !== 'ACTIVE' }),
            },
            [leastOneGroupRoleIsRequiredValidator],
          ),
        };
      }, {}),
    });

    this.groupsRolesFormGroup.valueChanges.pipe(takeUntil(this.unsubscribe$)).subscribe(() => {
      this.toggleSaveBar(true);
    });
    this.groupsRolesFormGroup.statusChanges.pipe(takeUntil(this.unsubscribe$)).subscribe((status) => {
      this.invalidStateSaveBar = status !== 'VALID';
    });
  }

  onDeleteTokenClicked(token: Token) {
    this.matDialog
      .open<GioConfirmDialogComponent, GioConfirmDialogData, boolean>(GioConfirmDialogComponent, {
        width: '450px',
        data: {
          title: 'Revoke a token',
          content: `Are you sure you want to revoke the token <strong>${token.name}</strong>?`,
          confirmButton: 'Remove',
        },
        role: 'alertdialog',
        id: 'revokeUsersTokenDialog',
      })
      .afterClosed()
      .pipe(
        takeUntil(this.unsubscribe$),
        filter((confirm) => confirm === true),
        switchMap(() => this.usersTokenService.revokeToken(this.ajsStateParams.userId, token.id)),
        tap(() => this.snackBarService.success(`Token successfully deleted!`)),
        catchError(({ error }) => {
          this.snackBarService.error(error.message);
          return EMPTY;
        }),
      )
      .subscribe(() => this.ngOnInit());
  }

  onGenerateTokenClicked() {
    this.matDialog
      .open<OrgSettingsUserGenerateTokenComponent, OrgSettingsUserGenerateTokenDialogData, Token>(OrgSettingsUserGenerateTokenComponent, {
        width: '750px',
        data: {
          userId: this.ajsStateParams.userId,
        },
        role: 'dialog',
        id: 'generateTokenDialog',
      })
      .afterClosed()
      .pipe(
        takeUntil(this.unsubscribe$),
        // tap(() => {
        //   this.snackBarService.success('Token successfully created!');
        // }),
        // catchError(({ error }) => {
        //   this.snackBarService.error(error.message);
        //   return EMPTY;
        // }),
      )
      .subscribe(() => this.ngOnInit());
  }
}
