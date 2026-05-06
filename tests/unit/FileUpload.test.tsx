import { render, screen } from '@testing-library/react';
import { FileUpload } from '../../src/components/FileUpload';

describe('FileUpload Component', () => {
  const mockOnFilesChange = jest.fn();
  const defaultProps = {
    label: 'Upload Files',
    accept: '.xlsx,.xls',
    multiple: false,
    onFilesChange: mockOnFilesChange,
    files: [],
  };

  beforeEach(() => {
    mockOnFilesChange.mockClear();
  });

  it('renders the component with correct label', () => {
    render(<FileUpload {...defaultProps} />);
    expect(screen.getByText('Upload Files')).toBeInTheDocument();
  });

  it('displays drag and drop area', () => {
    render(<FileUpload {...defaultProps} />);
    expect(screen.getByText('Arraste arquivos aqui ou clique para selecionar')).toBeInTheDocument();
  });
});