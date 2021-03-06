import React from 'react';
import {Spin} from 'antd';
import {DockLayout} from 'rc-dock/lib';
import {ClientConn} from '@ticlo/core/connect/ClientConn';
import {LazyUpdateComponent} from '@ticlo/editor/component/LazyUpdateComponent';
import {ObjectTree} from '@ticlo/editor/object-tree/ObjectTree';
import {mapPointsBetweenElement} from '@ticlo/editor/util/Position';

interface Props {
  conn: ClientConn;
  path: string;
  val: any;
}

export class ObjectTreePane extends LazyUpdateComponent<Props, any> {
  static dockGroup = {
    disableDock: true,
    maximizable: false
  };

  static openFloatPanel(
    layout: DockLayout,
    path: string,
    conn: ClientConn,
    val: any,
    fromElement: HTMLElement,
    source: any,
    offsetX = 0,
    offsetY = 0
  ) {
    let id = `objectTree-${path}`;
    let oldTab = layout.find(id);
    if (oldTab) {
      layout.dockMove(oldTab, null, 'remove');
    }

    let [x, y] = mapPointsBetweenElement(fromElement, layout._ref, offsetX, offsetY);

    let tabName = path.split('.').pop();
    let newPanel = {
      activeId: id,
      tabs: [
        {
          id,
          closable: true,
          title: tabName,
          group: 'objectTree',
          source,
          content: <ObjectTreePane conn={conn} path={path} val={val} />
        }
      ],
      x,
      y,
      w: 200,
      h: 200
    };
    layout.dockMove(newPanel, null, 'float');
  }

  static closeFloatPanel(layout: DockLayout, path: string, source: any) {
    let id = `objectTree-${path}`;
    let tab = layout.find(id);
    if (tab && (tab as any).source === source) {
      layout.dockMove(tab, null, 'remove');
    }
  }

  renderImpl() {
    let {path, conn, val} = this.props;

    return <ObjectTree conn={conn} path={path} data={val} />;
  }
}
