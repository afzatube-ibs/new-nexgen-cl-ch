import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dices, Eye, EyeOff } from 'lucide-react';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Input, Alert, Text, useToast } from '@nexgen/ui';
import type { CustomerDTO } from '@nexgen/api-client';
import { applyServerValidationErrors } from '../../framework/index.js';
import { customersErrorMessage } from './shared/errors.js';
import { useCreateCustomer, useUpdateCustomer } from './shared/queries.js';

const createSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(255),
    email: z.string().min(1, 'Email is required').email('Enter a valid email address').max(255),
    phone: z.string().max(50).optional(),
    // Length-checked here only (matches this codebase's own currency-code/
    // country-code field precedent) — the real mixed-case/number/symbol
    // rule stays server-side (`RegisterCustomerRequest`'s own
    // `Password::min(12)->mixedCase()->numbers()->symbols()`), surfaced
    // verbatim via `applyServerValidationErrors` on submit rather than
    // re-derived here.
    password: z.string().min(12, 'Must be at least 12 characters'),
    passwordConfirmation: z.string().min(1, 'Confirm the password'),
  })
  .refine((v) => v.password === v.passwordConfirmation, { message: 'Passwords do not match', path: ['passwordConfirmation'] });

const editSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  email: z.string().min(1, 'Email is required').email('Enter a valid email address').max(255),
  phone: z.string().max(50).optional(),
});

/**
 * One loose shape for both schemas — `resolver: zodResolver(isEdit ?
 * editSchema : createSchema)` switches the actual runtime validation by
 * `isEdit`; the static type here only needs to be wide enough for both
 * (`password`/`passwordConfirmation` optional, present as empty strings in
 * `EMPTY_VALUES` for the create case's controlled inputs).
 */
interface FormValues {
  name: string;
  email: string;
  phone?: string;
  password?: string;
  passwordConfirmation?: string;
}

export interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present for edit; absent for create. */
  customer?: CustomerDTO;
}

const EMPTY_VALUES: FormValues = { name: '', email: '', phone: '', password: '', passwordConfirmation: '' };

function valuesFromCustomer(customer?: CustomerDTO): FormValues {
  if (!customer) return EMPTY_VALUES;
  return { name: customer.name, email: customer.email, phone: customer.phone ?? '' };
}

/**
 * A cryptographically-random password meeting `RegisterCustomerRequest`'s
 * own real rule (12+ chars, mixed case, a number, a symbol) — pure
 * client-side convenience for the "staff sets an initial password on a
 * new customer's behalf" workflow the architecture doc's own §3/§9.1 flags
 * as a genuine open product question with no better answer available yet
 * (no self-service registration or password-reset flow exists on this
 * platform — out of this slice's explicit scope). This does not invent a
 * new business rule; it only saves a staff member from hand-typing a
 * string that satisfies one the backend already enforces.
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
 * Create/edit Customer — `customers.customers.manage`. Password fields only
 * render on create: `RegisterCustomerRequest` requires one (this is a
 * staff-set credential, since no self-service registration exists yet —
 * see this module's own architecture doc), `UpdateCustomerProfileRequest`
 * has no password field at all — editing a customer's profile can never
 * change their password from here, by design, not omission.
 */
export function CustomerFormDialog({ open, onOpenChange, customer }: CustomerFormDialogProps) {
  const isEdit = Boolean(customer);
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();
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
    defaultValues: valuesFromCustomer(customer),
  });

  useEffect(() => {
    if (open) reset(valuesFromCustomer(customer));
    setFormError(null);
    setShowPassword(false);
  }, [open, customer, reset]);

  function handleGeneratePassword(): void {
    const generated = generateStrongPassword();
    setValue('password', generated, { shouldValidate: true, shouldDirty: true });
    setValue('passwordConfirmation', generated, { shouldValidate: true, shouldDirty: true });
    setShowPassword(true);
  }

  async function onSubmit(values: FormValues): Promise<void> {
    setFormError(null);
    try {
      if (isEdit && customer) {
        await updateMutation.mutateAsync({
          id: customer.id,
          input: { name: values.name, email: values.email, phone: values.phone || null, expectedVersion: customer.version },
        });
        toast({ variant: 'success', title: 'Customer updated', description: `"${values.name}" has been saved.` });
      } else {
        await createMutation.mutateAsync({
          name: values.name,
          email: values.email,
          password: values.password ?? '',
          passwordConfirmation: values.passwordConfirmation ?? '',
          phone: values.phone || null,
        });
        toast({ variant: 'success', title: 'Customer created', description: `"${values.name}" has been added.` });
      }
      onOpenChange(false);
    } catch (error) {
      if (applyServerValidationErrors(error, setError)) return;
      setFormError(customersErrorMessage(error));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* See `CustomerAddressFormDialog`'s own docblock for why this override exists — same shared `DialogContent` height/scroll gap, applicable here whenever the create-only password section is showing. */}
      <DialogContent size="md" className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit customer' : 'New customer'}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update this customer's name, email, or phone." : 'Register a new customer account on their behalf.'}
          </DialogDescription>
        </DialogHeader>
        {formError && (
          <Alert variant="danger" className="mb-4" role="alert">
            {formError}
          </Alert>
        )}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <Input label="Name" hint="e.g. Jane Shopper." error={errors.name?.message} {...register('name')} />
          <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
          <Input label="Phone" hint="Optional." error={errors.phone?.message} {...register('phone')} />

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
                Set on the customer&rsquo;s behalf — share it with them directly. There is no self-service reset yet.
              </Text>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isEdit ? 'Save changes' : 'Create customer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
