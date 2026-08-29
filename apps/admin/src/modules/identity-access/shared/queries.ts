import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import {
  listUsersPaginated,
  getUser,
  createUser,
  updateUser,
  archiveUser,
  deleteUser,
  listRoles,
  getRole,
  createRole,
  updateRole,
  deleteRole,
  listPermissions,
  assignRole,
  revokeRole,
  type UserDTO,
  type RoleDTO,
  type PermissionDTO,
  type CreateUserInput,
  type UpdateUserInput,
  type ListUsersQuery,
  type CreateRoleInput,
  type UpdateRoleInput,
  type ListEnvelope,
} from '@nexgen/api-client';
import { apiClient } from '../../../lib/apiClient.js';

const USERS_KEY = 'identity-access-users';
const ROLES_KEY = 'identity-access-roles';
const PERMISSIONS_KEY = 'identity-access-permissions';

function useInvalidateUsersList(): () => void {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: [USERS_KEY, 'list'] });
}

/** `UserController::index` — genuinely server-side `status`/`sort`/`direction`/`page`/`per_page`, confirmed by reading the controller directly. */
export function useUsers(query: ListUsersQuery): UseQueryResult<ListEnvelope<UserDTO>> {
  return useQuery({ queryKey: [USERS_KEY, 'list', query], queryFn: () => listUsersPaginated(apiClient, query) });
}

export function useUser(id: string | undefined): UseQueryResult<UserDTO> {
  return useQuery({ queryKey: [USERS_KEY, 'detail', id], queryFn: () => getUser(apiClient, id as string), enabled: Boolean(id) });
}

export function useCreateUser(): UseMutationResult<UserDTO, unknown, CreateUserInput> {
  const invalidateList = useInvalidateUsersList();
  return useMutation({ mutationFn: (input: CreateUserInput) => createUser(apiClient, input), onSuccess: invalidateList });
}

export function useUpdateUser(): UseMutationResult<UserDTO, unknown, { id: string; input: UpdateUserInput }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }) => updateUser(apiClient, id, input),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: [USERS_KEY, 'list'] });
      void queryClient.invalidateQueries({ queryKey: [USERS_KEY, 'detail', id] });
    },
  });
}

export function useArchiveUser(): UseMutationResult<UserDTO, unknown, { id: string; expectedVersion: number }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, expectedVersion }) => archiveUser(apiClient, id, expectedVersion),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: [USERS_KEY, 'list'] });
      void queryClient.invalidateQueries({ queryKey: [USERS_KEY, 'detail', id] });
    },
  });
}

export function useDeleteUser(): UseMutationResult<void, unknown, { id: string; expectedVersion: number }> {
  const invalidateList = useInvalidateUsersList();
  return useMutation({ mutationFn: ({ id, expectedVersion }) => deleteUser(apiClient, id, expectedVersion), onSuccess: invalidateList });
}

/**
 * Role assignment invalidates the *user's* own detail query (`roles`
 * arrives bundled there) and the users list, since a role change is
 * visible in both places.
 */
export function useAssignRole(userId: string): UseMutationResult<UserDTO, unknown, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (roleId: string) => assignRole(apiClient, userId, roleId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [USERS_KEY, 'detail', userId] });
      void queryClient.invalidateQueries({ queryKey: [USERS_KEY, 'list'] });
    },
  });
}

export function useRevokeRole(userId: string): UseMutationResult<void, unknown, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (roleId: string) => revokeRole(apiClient, userId, roleId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [USERS_KEY, 'detail', userId] });
      void queryClient.invalidateQueries({ queryKey: [USERS_KEY, 'list'] });
    },
  });
}

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

function useInvalidateRolesList(): () => void {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: [ROLES_KEY, 'list'] });
}

export function useRoles(): UseQueryResult<ListEnvelope<RoleDTO>> {
  return useQuery({ queryKey: [ROLES_KEY, 'list'], queryFn: () => listRoles(apiClient) });
}

export function useRole(id: string | undefined): UseQueryResult<RoleDTO> {
  return useQuery({ queryKey: [ROLES_KEY, 'detail', id], queryFn: () => getRole(apiClient, id as string), enabled: Boolean(id) });
}

export function useCreateRole(): UseMutationResult<RoleDTO, unknown, CreateRoleInput> {
  const invalidateList = useInvalidateRolesList();
  return useMutation({ mutationFn: (input: CreateRoleInput) => createRole(apiClient, input), onSuccess: invalidateList });
}

export function useUpdateRole(): UseMutationResult<RoleDTO, unknown, { id: string; input: UpdateRoleInput }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }) => updateRole(apiClient, id, input),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: [ROLES_KEY, 'list'] });
      void queryClient.invalidateQueries({ queryKey: [ROLES_KEY, 'detail', id] });
      // A role's own permission set changing can change what any user
      // holding it can now do — the Users list/detail's own `roles`
      // (and, for the currently-signed-in operator specifically,
      // `useAuth`'s own permission set on their next `/auth/me` refresh)
      // should not silently show a stale permission list.
      void queryClient.invalidateQueries({ queryKey: [USERS_KEY] });
    },
  });
}

export function useDeleteRole(): UseMutationResult<void, unknown, { id: string; expectedVersion: number }> {
  const invalidateList = useInvalidateRolesList();
  return useMutation({ mutationFn: ({ id, expectedVersion }) => deleteRole(apiClient, id, expectedVersion), onSuccess: invalidateList });
}

/** `GET /permissions` — the real, code-registered catalog, used to compose a role's own permission checkboxes. Rarely changes within a session — a long `staleTime` avoids refetching it on every dialog open. */
export function usePermissions(): UseQueryResult<PermissionDTO[]> {
  return useQuery({ queryKey: [PERMISSIONS_KEY], queryFn: () => listPermissions(apiClient), staleTime: 5 * 60 * 1000 });
}
