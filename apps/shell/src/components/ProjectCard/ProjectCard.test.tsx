import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { todo } from '../../content/placeholder.ts';
import type { Project } from '../../projects/model.ts';
import { same } from '../../test/localized.ts';
import ProjectCard from './ProjectCard.tsx';

const project: Project = {
  id: 'demo',
  name: same('Demo project'),
  status: 'in-progress',
  description: same('A demo.'),
  tech: ['react', 'typescript'],
  links: [
    { label: same('Live demo'), href: 'https://example.com' },
    { label: same('Source code'), href: todo('repository URL') },
  ],
};

describe('ProjectCard', () => {
  it('is an article named by its heading, with status, description and technologies', () => {
    render(<ProjectCard project={project} />);

    const card = screen.getByRole('article', { name: 'Demo project' });
    expect(within(card).getByRole('heading', { level: 2 })).toHaveTextContent('Demo project');
    expect(within(card).getByText('In progress')).toBeInTheDocument();
    expect(within(card).getByText('A demo.')).toBeInTheDocument();
    const tech = within(card).getByRole('list', { name: 'Technologies' });
    expect(within(tech).getAllByRole('listitem')).toHaveLength(2);
  });

  it('links confirmed URLs and never links a placeholder', () => {
    render(<ProjectCard project={project} />);

    expect(screen.getByRole('link', { name: 'Live demo' })).toHaveAttribute(
      'href',
      'https://example.com',
    );
    expect(screen.queryByRole('link', { name: /source code/i })).not.toBeInTheDocument();
    expect(screen.getByText('To confirm: repository URL')).toBeInTheDocument();
  });
});
