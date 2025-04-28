import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IsbnStorageService } from '../../services/isbn-storage.service';

@Component({
  selector: 'app-saved-books',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './saved-books.component.html',
  styleUrls: ['./saved-books.component.css']
})
export class SavedBooksComponent implements OnInit {
  savedIsbns: string[] = [];
  importError: string | null = null;
  importSuccess = false;
  fileInputLabel = 'Choisir un fichier JSON';

  constructor(private isbnStorageService: IsbnStorageService) {}

  ngOnInit(): void {
    // Load saved ISBNs on component initialization
    this.loadSavedIsbns();

    // Subscribe to changes in saved ISBNs
    this.isbnStorageService.savedIsbns$.subscribe(isbns => {
      this.savedIsbns = isbns;
    });
  }

  /**
   * Load saved ISBNs from the service
   */
  loadSavedIsbns(): void {
    this.savedIsbns = this.isbnStorageService.getSavedIsbns();
  }

  /**
   * Remove an ISBN from the saved list
   */
  removeIsbn(isbn: string): void {
    this.isbnStorageService.removeIsbn(isbn);
  }

  /**
   * Clear all saved ISBNs
   */
  clearAllIsbns(): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer tous les ISBN sauvegardés?')) {
      this.isbnStorageService.clearAllIsbns();
    }
  }

  /**
   * Export saved ISBNs as a JSON file
   */
  exportIsbns(): void {
    if (this.savedIsbns.length === 0) {
      alert('Aucun ISBN à exporter.');
      return;
    }
    
    this.isbnStorageService.generateExportFile();
  }

  /**
   * Handle file selection for import
   */
  onFileSelected(event: Event): void {
    const fileInput = event.target as HTMLInputElement;
    const file = fileInput?.files?.[0];
    
    // Reset status
    this.importError = null;
    this.importSuccess = false;
    
    if (!file) {
      this.fileInputLabel = 'Choisir un fichier JSON';
      return;
    }
    
    this.fileInputLabel = file.name;
    
    // Check file type
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      this.importError = 'Le fichier doit être de type JSON.';
      return;
    }
    
    // Read file
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonData = e.target?.result as string;
        const success = this.isbnStorageService.importFromJson(jsonData);
        
        if (success) {
          this.importSuccess = true;
        } else {
          this.importError = 'Format de fichier JSON invalide.';
        }
      } catch (error) {
        this.importError = 'Erreur lors de la lecture du fichier.';
        console.error('Error importing ISBNs:', error);
      }
    };
    
    reader.onerror = () => {
      this.importError = 'Erreur lors de la lecture du fichier.';
    };
    
    reader.readAsText(file);
  }
}
