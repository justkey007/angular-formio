import { Input, Output, ViewChild, TemplateRef, EventEmitter } from '@angular/core';
import { GridHeaderComponent } from './GridHeaderComponent';
import { GridBodyComponent } from './GridBodyComponent';
export class GridFooterComponent {
  @Input() header: GridHeaderComponent;
  @Input() body: GridBodyComponent;
  @Input() createText: String;
  @Output() pageChanged: EventEmitter<any>;
  @Output() createItem: EventEmitter<any>;
  @ViewChild(TemplateRef) template: TemplateRef<any>;
  constructor() {
    this.pageChanged = new EventEmitter();
    this.createItem = new EventEmitter();
  }
}
