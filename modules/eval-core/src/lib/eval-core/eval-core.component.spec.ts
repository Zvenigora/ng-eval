import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EvalCoreComponent } from './eval-core.component';

describe('EvalCoreComponent', () => {
  let component: EvalCoreComponent;
  let fixture: ComponentFixture<EvalCoreComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EvalCoreComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EvalCoreComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
