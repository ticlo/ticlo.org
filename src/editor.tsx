import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {DragState, DockLayout} from 'rc-dock';
import qs from 'qs';
import {FunctionDesc, PropDesc} from '@ticlo/core/editor';
import {initEditor, PropertyList, BlockStage, NodeTree} from '@ticlo/editor';
import {ClientConnection} from '@ticlo/core/connect/ClientConnection';
import {TypeTree} from '@ticlo/editor/type-selector/TypeTree';
import {Logger} from '@ticlo/core/util/Logger';
import {WorkerFunction} from '@ticlo/core/worker/WorkerFunction';
import {BlockStagePane} from '@ticlo/editor/dock/block/BlockStagePane';
import {TicloLayoutContext, TicloLayoutContextType} from '@ticlo/editor/component/LayoutContext';
import {PropDispatcher} from '@ticlo/core/block/Dispatcher';
import {PropertyListPane} from '@ticlo/editor/dock/property/PropertyListPane';
import {WsBrowserConnection} from '@ticlo/html/connect/WsBrowserConnection';
import {FrameClientConnection} from '@ticlo/html/connect/FrameClientConnection';
import {NodeTreePane} from '@ticlo/editor/dock/node-tree/NodeTreePane';
import {TextEditorPane} from '@ticlo/editor/dock/text-editor/TextEditorPane';

import {ObjectTreePane} from './dock/object-tree/ObjectTreePane';

let query = qs.parse(window.location.search.substring(1));

const layoutGroups = {
  blockStage: {
    animated: false,
    floatable: true
  },
  objectTree: ObjectTreePane.dockGroup
};

interface Props {
  conn: ClientConnection;
}

interface State {}

WorkerFunction.registerType({'#is': ''}, {name: 'class1'}, 'WorkerEditor');

class App extends React.PureComponent<Props, State> implements TicloLayoutContext {
  constructor(props: Props) {
    super(props);
  }

  forceUpdateLambda = () => this.forceUpdate();
  forceUpdateImmediate = () => {
    this.props.conn.callImmediate(this.forceUpdateLambda);
  };

  layout: DockLayout;
  getLayout = (layout: DockLayout) => {
    this.layout = layout;
  };

  selectedPaths: PropDispatcher<string[]> = new PropDispatcher();

  onSelect = (paths: string[], handled: boolean = false) => {
    if (!handled) {
      this.selectedPaths.updateValue(paths);
    }
  };

  createBlockEditorTab(path: string, onSave?: () => void) {
    let {conn} = this.props;
    return BlockStagePane.createDockTab(path, conn, this.onSelect, onSave);
  }

  /// implements TicloLayoutContext
  editJob(path: string, onSave: () => void) {
    this.layout.dockMove(this.createBlockEditorTab(path, onSave), this.layout.find('main'), 'middle');
  }
  editProperty(paths: string[], propDesc: PropDesc, defaultValue?: any, mime?: string, readonly?: boolean): void {
    let {conn} = this.props;
    if (!mime) {
      if (propDesc.mime) {
        mime = propDesc.mime;
      } else if (propDesc.type === 'object' || propDesc.type === 'array') {
        mime = 'application/json';
      }
    }
    TextEditorPane.openFloatPanel(this.layout, conn, paths, defaultValue, mime, readonly);
  }
  showObjectTree(path: string, value: any, element: HTMLElement, source: any) {
    let {conn} = this.props;
    ObjectTreePane.openFloatPanel(this.layout, path, conn, value, element, source, 18, 0);
  }
  closeObjectTree(path: string, source: any) {
    ObjectTreePane.closeFloatPanel(this.layout, path, source);
  }

  onDragBlock = (e: DragState) => {
    let {conn} = this.props;
    e.setData(
      {
        block: {
          '#is': 'add',
          '1': 4,
          '@b-p': ['0', '1', 'output', '@b-p', '#is']
        }
      },
      conn
    );
    e.startDrag();
  };
  onDragSlider = (e: DragState) => {
    let {conn} = this.props;
    e.setData(
      {
        block: {
          '#is': 'slider-view',
          '@b-p': ['value']
        }
      },
      conn
    );
    e.startDrag();
  };

  render() {
    let {conn} = this.props;

    let layout: any = {
      dockbox: {
        mode: 'horizontal',
        children: [
          {
            mode: 'vertical',
            size: 200,
            children: [
              {
                tabs: [
                  {
                    id: 'Navigation',
                    title: 'Navigation',
                    cached: true,
                    cacheContext: TicloLayoutContextType,
                    content: (
                      <NodeTreePane
                        conn={conn}
                        basePaths={['']}
                        hideRoot={true}
                        onSelect={this.onSelect}
                        showMenu={true}
                      />
                    )
                  }
                ]
              },
              {
                tabs: [
                  {
                    id: 'Functions',
                    title: 'Functions',
                    cached: true,
                    content: <TypeTree conn={conn} style={{height: '100%'}} />
                  },
                  {
                    id: 'Properties',
                    title: 'Properties',
                    cached: true,
                    cacheContext: TicloLayoutContextType,
                    content: <PropertyListPane conn={conn} />
                  }
                ]
              }
            ]
          },

          {
            size: 800,
            tabs: query.job ? [this.createBlockEditorTab(query.job, () => conn.applyJobChange(query.job))] : [],
            id: 'main',
            panelLock: {panelStyle: 'main'}
          }
        ]
      }
    };
    return (
      <TicloLayoutContextType.Provider value={this}>
        <DockLayout
          defaultLayout={layout}
          ref={this.getLayout}
          groups={layoutGroups}
          style={{position: 'absolute', left: 10, top: 10, right: 10, bottom: 10}}
        />
      </TicloLayoutContextType.Provider>
    );
  }
}

(async () => {
  await initEditor();
  let client;
  if (query.host) {
    if (query.host.startsWith('ws')) {
      client = new WsBrowserConnection(query.host);
    }
  } else if (window.opener) {
    client = new FrameClientConnection(window.opener);
  }

  ReactDOM.render(<App conn={client} />, document.getElementById('app'));
})();

(window as any).Logger = Logger;
