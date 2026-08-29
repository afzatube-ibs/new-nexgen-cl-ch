import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dices, Eye, EyeOff } from 'lucide-react';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Input, Alert, Text, useToast } from '@nexgen/ui';
import type { UserDTO } from '@nexgen/api-client';
import { applyServerValidationErrors } from '../../framework/index.js';
import { identityAccessErrorMessage } from './shared/errors.js';
import { useCreateUser, useUpdateUser } from './shared/queries.js';

const createSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(255),
    email: z.string().min(1, 'Email is required').email('Enter a valid email address').max(255),
    // Length-checked here only — the real mixed-case/number/symbol rule
    // stays server-side (`RegisterUserRequest`'s own
    // `Password::min(12)->mixedCase()->numbers()->symbols()`), surfaced
    // verbatim via `applyServerValidationErrors` on submit, matching
    // Customers' own `CustomerFormDialog` precedent exactly.
    password: z.string().min(12, 'Must be at least 12 characters'),
    passwordConfirmation: z.string().min(1, 'Confirm the password'),
  })
  .refine((v) => v.password === v.passwordConfirmation, { message: 'Passwords do not match', path: ['passwordConfirmation'] });

const editSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  email: z.string().min(1, 'Email is required').email('Enter a valid email address').max(255),
});

interface FormValues {
  name: string;
  email: string;
  password?: string;
  passwordConfirmation?: string;
}

export interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present for edit; absent for create. */
  user?: UserDTO;
}

const EMPTY_VALUES: FormValues = { name: '', email: '', password: '', passwordConfirmation: '' };

function valuesFromUser(user?: UserDTO): FormValues {
  if (!user) return EMPTY_VALUES;
  return { name: user.name, email: user.email };
}

/**
 * A cryptographically-random password meeting `RegisterUserRequest`'s own
 * real rule (12+ chars, mixed case, a number, a symbol) — duplicated
 * rather than imported, matching Customers' own `CustomerFormDialog`
 * precedent for this exact same helper (each module owns its own copy of
 * shared-shaped, non-business-logic UI convenience code).
 */
function generateStrongPassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%^&*-_=+';
  const all = upper + lower + digits + symbols;
  const pick = (chars: string) => chars[Math.floor(Math.random() * chars.length)]!;
  const required = [pick(upper), pick(lower), pick(digits), pick(symbols)];
  const rest = Array.from({ length: 12 }, () => pick(all));
  const combined = [...required, ...rest];
  for (let i = combined.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [combined[i], combined[j]] = [combined[j]!, combined[i]!];
  }
  return combined.join('');
}

/**
 * Create/edit a staff account — `identity_access.users.manage`. Named
 * "New staff member," not "Invite" — `RegisterUserAction` issues no
 * invitation email of its own (no such Action/listener exists on the
 * real backend); this creates a real account with a real, staff-chosen
 * password immediately, so the label promises exactly what happens, not
 * a real-time email flow this platform doesn't have.
 *
 * Role assignment is deliberately NOT part of this dialog — it lives on
 * `UserDetailPage`'s own dedicated Roles card, mirroring how Customers'
 * own address book is a detail-page concern, never bundled into the
 * create/edit form.
 */
export function UserFormDialog({ open, onOpenChange, user }: UserFormDialogProps) {
  const isEdit = Boolean(user);
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const { toast } = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(isEdit ? editSchema : createSchema),
    defaultValues: valuesFromUser(user),
  });

  useEffect(() => {
    if (open) reset(valuesFromUser(user));
    setFormError(null);
    setShowPassword(false);
  }, [open, user, reset]);

  function handleGeneratePassword(): void {
    const generated = generateStrongPassword();
    setValue('password', generated, { shouldValidate: true, shouldDirty: true });
    setValue('passwordConfirmation', generated, { shouldValidate: true, shouldDirty: true });
    setShowPassword(true);
  }

  async function onSubmit(values: FormValues): Promise<void> {
    setFormError(null);
    try {
      if (isEdit && user) {
        await updateMutation.mutateAsync({ id: user.id, input: { name: values.name, email: values.email, expectedVersion: user.version } });
        toast({ variant: 'success', title: 'Staff account updated', description: `"${values.name}" has been saved.` });
      } else {
        await createMutation.mutateAsync({
          name: values.name,
          email: values.email,
          password: values.password ?? '',
          passwordConfirmation: values.passwordConfirmation ?? '',
        });
        toast({ variant: 'success', title: 'Staff account created', description: `"${values.name}" has been added. Assign a role from their detail page next.` });
      }
      onOpenChange(false);
    } catch (error) {
      if (applyServerValidationErrors(error, setError)) return;
      setFormError(identityAccessErrorMessage(error));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md" className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit staff account' : 'New staff member'}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update this staff member's name or email." : 'Create a real account for a new staff member. No role is assigned yet.'}
          </DialogDescription>
        </DialogHeader>
        {formError && (
          <Alert variant="danger" className="mb-4" role="alert">
            {formError}
          </Alert>
        )}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <Input label="Name" error={errors.name?.message} {...register('name')} />
          <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />

          {!isEdit && (
            <div className="flex flex-col gap-2 rounded-md border border-border p-3">
              <div className="flex items-center justify-between">
                <Text variant="body-strong">Password</Text>
                <Button type="button" variant="outline" size="sm" onClick={handleGeneratePassword}>
                  <Dices className="size-4" /> Generate
                </Button>
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Input
                    label="Password"
                    hint="At least 12 characters, with upper and lower case, a number, and a symbol."
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    error={errors.password?.message}
                    {...register('password')}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
              <Input
                label="Confirm password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                error={errors.passwordConfirmation?.message}
                {...register('passwordConfirmation')}
              />
              <Text variant="caption" className="text-text-secondary">
                Set on their behalf — share it with them directly. There is no self-service password change or reset for staff accounts yet.
              </Text>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isEdit ? 'Save changes' : 'Create staff account'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
