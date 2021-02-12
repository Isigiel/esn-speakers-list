import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { AngularFirestore } from '@angular/fire/firestore';
import { catchError, first, map, shareReplay, switchMap } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { NewListDialogComponent } from '../../components/new-list-dialog/new-list-dialog.component';
import { FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { List, User } from '../../models';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { MatSidenav } from '@angular/material/sidenav';

@Component({
  selector: 'app-lists-page',
  templateUrl: './lists-page.component.html',
  styleUrls: ['./lists-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListsPageComponent {
  public user$: Observable<User>;
  public lists$: Observable<List[]>;
  public isCt$: Observable<boolean>;
  isHandset$: Observable<boolean>;
  public listIdField = new FormControl();

  constructor(
    private breakpointObserver: BreakpointObserver,
    private auth: AuthService,
    private store: AngularFirestore,
    private dialog: MatDialog,
    router: Router
  ) {
    this.isHandset$ = this.breakpointObserver
      .observe('(max-width: 1199px)')
      .pipe(
        map((result) => result.matches),
        shareReplay(1)
      );
    this.listIdField.valueChanges.subscribe((id) =>
      router.navigate(['lists', id])
    );
    this.user$ = auth.user$;
    this.isCt$ = this.user$.pipe(map((user) => user.isAdmin || user.isCt));
    this.lists$ = auth.user$.pipe(
      switchMap((user) => {
        if (user.isCt || user.isAdmin) {
          return store
            .collection<List>('lists', (ref) => ref.orderBy('name'))
            .valueChanges({ idField: 'id' })
            .pipe(
              catchError((err) => {
                console.log(err);
                return of([]);
              })
            );
        } else {
          return store
            .collection<List>('lists', (ref) =>
              ref.where('isVisible', '==', true).orderBy('name')
            )
            .valueChanges({ idField: 'id' })
            .pipe(
              catchError((err) => {
                console.log(err);
                return of([]);
              })
            );
        }
      })
    );
  }

  async closeSidenav(drawer: MatSidenav): Promise<void> {
    const isHandset = await this.isHandset$.pipe(first()).toPromise();
    if (isHandset) {
      await drawer.close();
    }
  }

  async createList(): Promise<void> {
    const listName = await this.dialog
      .open<NewListDialogComponent, any, string>(NewListDialogComponent)
      .afterClosed()
      .toPromise();
    if (listName) {
      await this.store.collection('lists').add({
        name: listName,
        isVisible: false,
        isOpen: false,
        timestamp: new Date(),
      });
    }
  }

  syncForm(route: ActivatedRoute): void {
    this.listIdField.setValue(route.snapshot.paramMap.get('id'), {
      emitEvent: false,
    });
  }

  async showList(list: any): Promise<void> {
    await this.store
      .collection('lists')
      .doc<List>(list.id)
      .update({ isVisible: true });
  }

  async hideList(list: any): Promise<void> {
    await this.store
      .collection('lists')
      .doc<List>(list.id)
      .update({ isVisible: false, isOpen: false });
  }

  async openList(list: any): Promise<void> {
    await this.store
      .collection('lists')
      .doc<List>(list.id)
      .update({ isVisible: true, isOpen: true });
  }

  async closeList(list: any): Promise<void> {
    await this.store
      .collection('lists')
      .doc<List>(list.id)
      .update({ isOpen: false });
  }

  stopClick($event: MouseEvent) {
    $event.stopImmediatePropagation();
    $event.stopPropagation();
    $event.preventDefault();
  }
}
