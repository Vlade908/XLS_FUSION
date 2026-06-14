import { render, screen, fireEvent } from '@testing-library/react';
import { FileCard } from '../../src/components/FileCard';

describe('FileCard Component', () => {
  const mockOnFileChange = jest.fn();
  const defaultProps = {
    title: 'Excel Spreadsheet',
    subtitle: 'Upload your corporate excel file here',
    icon: '📊',
    file: null,
    onFileChange: mockOnFileChange,
    multiple: false,
    color: 'bg-indigo-500',
  };

  beforeEach(() => {
    mockOnFileChange.mockClear();
  });

  it('renders the component with title and subtitle', () => {
    render(<FileCard {...defaultProps} />);
    expect(screen.getByText('Excel Spreadsheet')).toBeInTheDocument();
    expect(screen.getByText('Upload your corporate excel file here')).toBeInTheDocument();
    expect(screen.getByText('📊')).toBeInTheDocument();
  });

  it('renders "Selecionar" button when file is null', () => {
    render(<FileCard {...defaultProps} />);
    expect(screen.getByText('Selecionar')).toBeInTheDocument();
  });

  it('calls onFileChange when a file is selected via input click', () => {
    render(<FileCard {...defaultProps} />);
    const file = new File(['dummy content'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const input = screen.getByRole('button').previousSibling as HTMLInputElement;

    // Simulate input change
    fireEvent.change(input, { target: { files: [file] } });

    expect(mockOnFileChange).toHaveBeenCalledWith(file);
  });

  it('renders "Trocar" and file name when a single file is provided', () => {
    const file = new File(['dummy content'], 'sheet.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    render(<FileCard {...defaultProps} file={file} />);

    expect(screen.getByText('Trocar')).toBeInTheDocument();
    expect(screen.getByText('📄 sheet.xlsx')).toBeInTheDocument();
    expect(screen.getByText('Ativo')).toBeInTheDocument();
  });

  it('calls onFileChange with null when remove button is clicked', () => {
    const file = new File(['dummy content'], 'sheet.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    render(<FileCard {...defaultProps} file={file} />);

    const removeBtn = screen.getByRole('button', { name: /remover arquivo/i });
    fireEvent.click(removeBtn);

    expect(mockOnFileChange).toHaveBeenCalledWith(null);
  });

  it('displays number of items when multiple files are provided', () => {
    // Create a mock FileList-like object
    const file1 = new File(['content1'], 'file1.xlsx');
    const file2 = new File(['content2'], 'file2.xlsx');
    
    // In javascript/typescript environment we can mock FileList or cast it
    const fileList = {
      0: file1,
      1: file2,
      length: 2,
      item: (index: number) => [file1, file2][index],
    } as unknown as FileList;

    render(<FileCard {...defaultProps} file={fileList} multiple={true} />);

    expect(screen.getByText('2 Itens')).toBeInTheDocument();
  });

  it('triggers drag over and drop events', () => {
    render(<FileCard {...defaultProps} />);
    const dropZone = screen.getByTestId('drop-zone');

    fireEvent.dragOver(dropZone);
    expect(dropZone.className).toContain('border-indigo-500');

    const file = new File(['content'], 'dragged.xlsx');
    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [file],
      },
    });

    expect(mockOnFileChange).toHaveBeenCalledWith(file);
  });
});
