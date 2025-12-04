import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import SelectRolePage from '../select-role/page';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

// Mock Clerk
vi.mock('@clerk/nextjs', () => ({
  useUser: vi.fn(),
}));

const mockPush = vi.fn();
const mockUseRouter = useRouter as ReturnType<typeof vi.fn>;
const mockUseUser = useUser as ReturnType<typeof vi.fn>;

describe('SelectRolePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseRouter.mockReturnValue({ push: mockPush });
  });

  it('should render all three role options', () => {
    mockUseUser.mockReturnValue({
      user: { id: 'user_123' },
      isLoaded: true,
    });

    render(<SelectRolePage />);

    expect(screen.getByText('Tax Client')).toBeInTheDocument();
    expect(screen.getByText('I need tax preparation services')).toBeInTheDocument();

    expect(screen.getByText('Tax Preparer')).toBeInTheDocument();
    expect(
      screen.getByText('I prepare taxes and want customized marketing materials')
    ).toBeInTheDocument();

    expect(screen.getByText('Affiliate Marketer')).toBeInTheDocument();
    expect(
      screen.getByText('I want to market tax services and earn referral commissions')
    ).toBeInTheDocument();
  });

  it('should have continue button disabled when no role selected', () => {
    mockUseUser.mockReturnValue({
      user: { id: 'user_123' },
      isLoaded: true,
    });

    render(<SelectRolePage />);

    const continueButton = screen.getByRole('button', { name: /continue/i });
    expect(continueButton).toBeDisabled();
  });

  it('should enable continue button when role is selected', () => {
    mockUseUser.mockReturnValue({
      user: { id: 'user_123' },
      isLoaded: true,
    });

    render(<SelectRolePage />);

    const clientButton = screen.getByText('Tax Client').closest('button');
    fireEvent.click(clientButton!);

    const continueButton = screen.getByRole('button', { name: /continue/i });
    expect(continueButton).toBeEnabled();
  });

  it('should highlight selected role', () => {
    mockUseUser.mockReturnValue({
      user: { id: 'user_123' },
      isLoaded: true,
    });

    render(<SelectRolePage />);

    const preparerButton = screen.getByText('Tax Preparer').closest('button');
    fireEvent.click(preparerButton!);

    expect(preparerButton).toHaveClass('border-primary');
  });

  it('should update user metadata and redirect on continue', async () => {
    const mockUpdate = vi.fn().mockResolvedValue({});
    mockUseUser.mockReturnValue({
      user: {
        id: 'user_123',
        update: mockUpdate,
      },
      isLoaded: true,
    });

    render(<SelectRolePage />);

    // Select affiliate role
    const affiliateButton = screen.getByText('Affiliate Marketer').closest('button');
    fireEvent.click(affiliateButton!);

    // Click continue
    const continueButton = screen.getByRole('button', { name: /continue/i });
    fireEvent.click(continueButton);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({
        publicMetadata: { role: 'affiliate' },
      });
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard/affiliate');
    });
  });

  it('should show loading state during role update', async () => {
    const mockUpdate = vi
      .fn()
      .mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));
    mockUseUser.mockReturnValue({
      user: {
        id: 'user_123',
        update: mockUpdate,
      },
      isLoaded: true,
    });

    render(<SelectRolePage />);

    const clientButton = screen.getByText('Tax Client').closest('button');
    fireEvent.click(clientButton!);

    const continueButton = screen.getByRole('button', { name: /continue/i });
    fireEvent.click(continueButton);

    await waitFor(() => {
      expect(screen.getByText(/setting up your account/i)).toBeInTheDocument();
    });
  });

  it('should display error message when update fails', async () => {
    const mockUpdate = vi.fn().mockRejectedValue(new Error('Update failed'));
    mockUseUser.mockReturnValue({
      user: {
        id: 'user_123',
        update: mockUpdate,
      },
      isLoaded: true,
    });

    render(<SelectRolePage />);

    const clientButton = screen.getByText('Tax Client').closest('button');
    fireEvent.click(clientButton!);

    const continueButton = screen.getByRole('button', { name: /continue/i });
    fireEvent.click(continueButton);

    await waitFor(() => {
      expect(screen.getByText(/failed to update role/i)).toBeInTheDocument();
    });

    // Button should be re-enabled after error
    expect(continueButton).toBeEnabled();
  });

  it('should redirect to correct dashboard based on selected role', async () => {
    const roles = [
      { role: 'client', path: '/dashboard/client', label: 'Tax Client' },
      { role: 'tax_preparer', path: '/dashboard/tax-preparer', label: 'Tax Preparer' },
      { role: 'affiliate', path: '/dashboard/affiliate', label: 'Affiliate Marketer' },
    ];

    for (const { role, path, label } of roles) {
      const mockUpdate = vi.fn().mockResolvedValue({});
      mockUseUser.mockReturnValue({
        user: { id: 'user_123', update: mockUpdate },
        isLoaded: true,
      });
      mockPush.mockClear();

      const { unmount } = render(<SelectRolePage />);

      const roleButton = screen.getByText(label).closest('button');
      fireEvent.click(roleButton!);

      const continueButton = screen.getByRole('button', { name: /continue/i });
      fireEvent.click(continueButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(path);
      });

      unmount();
    }
  });
});
