import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Navigation } from './App';

test('renders marketplace navigation links', () => {
    render(
        <MemoryRouter>
            <Navigation />
        </MemoryRouter>
    );

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Add Product')).toBeInTheDocument();
    expect(screen.getByText('Manage Shipping')).toBeInTheDocument();
    expect(screen.getByText('Purchased Orders')).toBeInTheDocument();
});
