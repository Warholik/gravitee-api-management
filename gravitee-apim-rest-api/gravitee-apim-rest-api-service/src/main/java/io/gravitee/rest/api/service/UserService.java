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
package io.gravitee.rest.api.service;

import io.gravitee.common.data.domain.Page;
import io.gravitee.repository.management.api.search.UserCriteria;
import io.gravitee.rest.api.model.*;
import io.gravitee.rest.api.model.common.Pageable;
import io.gravitee.rest.api.model.configuration.identity.RoleMappingEntity;
import io.gravitee.rest.api.model.configuration.identity.SocialIdentityProviderEntity;
import io.gravitee.rest.api.service.common.JWTHelper.ACTION;
import java.util.*;

/**
 * @author David BRASSELY (david.brassely at graviteesource.com)
 * @author Nicolas GERAUD (nicolas.geraud at graviteesource.com)
 * @author Azize Elamrani (azize.elamrani at graviteesource.com)
 * @author GraviteeSource Team
 */
public interface UserService {
    UserEntity connect(String userId);

    UserEntity findById(String id, boolean defaultValue);

    default UserEntity findById(String id) {
        return findById(id, false);
    }

    Optional<UserEntity> findByEmail(String email);

    UserEntity findByIdWithRoles(String id);

    UserEntity findBySource(String source, String sourceId, boolean loadRoles);

    Set<UserEntity> findByIds(Collection<String> ids);

    Set<UserEntity> findByIds(Collection<String> ids, boolean withUserMetadata);

    UserEntity create(NewExternalUserEntity newExternalUserEntity, boolean addDefaultRole);

    UserEntity update(String userId, UpdateUserEntity updateUserEntity);

    UserEntity update(String userId, UpdateUserEntity updateUserEntity, String newsletterEmail);

    Page<UserEntity> search(String query, Pageable pageable);

    Page<UserEntity> search(UserCriteria criteria, Pageable pageable);

    UserEntity register(NewExternalUserEntity newExternalUserEntity);

    UserEntity register(NewExternalUserEntity newExternalUserEntity, String confirmationPageUrl);

    UserEntity finalizeRegistration(RegisterUserEntity registerUserEntity);

    UserEntity finalizeResetPassword(ResetPasswordUserEntity registerUserEntity);

    UserEntity processRegistration(String userId, boolean accepted);

    PictureEntity getPicture(String id);

    void delete(String id);

    void resetPassword(String id);

    UserEntity resetPasswordFromSourceId(String sourceId, String resetPageUrl);

    Map<String, Object> getTokenRegistrationParams(UserEntity userEntity, String portalUri, ACTION action);

    Map<String, Object> getTokenRegistrationParams(UserEntity userEntity, String portalUri, ACTION action, String confirmationPageUrl);

    UserEntity create(NewPreRegisterUserEntity newPreRegisterUserEntity);

    UserEntity createOrUpdateUserFromSocialIdentityProvider(SocialIdentityProviderEntity socialProvider, String userInfo);

    void updateUserRoles(String userId, MembershipReferenceType referenceType, String referenceId, List<String> roleIds);

    void computeRolesToAddUser(
        String username,
        List<RoleMappingEntity> mappings,
        String userInfo,
        Set<RoleEntity> rolesToAddToOrganization,
        Map<String, Set<RoleEntity>> rolesToAddToEnvironments
    );
}
