import { TestBed } from '@angular/core/testing';

import { SparklQueryBuilderService } from './sparkl-query-builder.service';

describe('SparklQueryBuilderService', () => {
  let service: SparklQueryBuilderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SparklQueryBuilderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
