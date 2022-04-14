import React, { useContext } from 'react';
import { Dropdown, Menu, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { cx } from '@emotion/css';
import { addButtonClass, branchBlockClass, branchClass, nodeBlockClass, nodeCardClass, nodeHeaderClass, nodeTitleClass } from './style';

import {
  useCollection,
  useResourceActionContext
} from '..';
import { Instruction, instructions, Node } from './nodes';




function makeNodes(nodes): void {
  const nodesMap = new Map();
  nodes.forEach(item => nodesMap.set(item.id, item));
  for (let node of nodesMap.values()) {
    if (node.upstreamId) {
      node.upstream = nodesMap.get(node.upstreamId);
    }

    if (node.downstreamId) {
      node.downstream = nodesMap.get(node.downstreamId);
    }
  }
}

const FlowContext = React.createContext(null);

export function useFlowContext() {
  return useContext(FlowContext);
}

export function WorkflowCanvas() {
  const { data, refresh, loading } = useResourceActionContext();

  if (!data?.data && !loading) {
    return <div>加载失败</div>;
  }

  const { nodes = [], ...workflow } = data?.data ?? {};

  makeNodes(nodes);

  const entry = nodes.find(item => !item.upstream);

  return (
    <FlowContext.Provider value={{
      workflow,
      nodes,
      onNodeAdded: refresh,
      onNodeRemoved: refresh
    }}>
      <div className={branchBlockClass}>
        <Branch entry={entry} />
      </div>
      <div className={cx(nodeCardClass)}>结束</div>
    </FlowContext.Provider>
  );
}

export function Branch({
  from = null,
  entry = null,
  branchIndex = null,
  controller = null
}) {
  const list = [];
  for (let node = entry; node; node = node.downstream) {
    list.push(node);
  }

  return (
    <div className={cx(branchClass)}>
      <div className="workflow-branch-lines" />
      {controller}
      <AddButton upstream={from} branchIndex={branchIndex} />
      <div className="workflow-node-list">
        {list.map(item => <Node data={item} key={item.id} />)}
      </div>
    </div>
  );
}

// TODO(bug): useless observable
// const instructionsList = observable(Array.from(instructions.getValues()));

interface AddButtonProps {
  upstream;
  branchIndex?: number;
};

export function AddButton({ upstream, branchIndex = null }: AddButtonProps) {
  const { resource } = useCollection();
  const { data } = useResourceActionContext();
  const { onNodeAdded } = useFlowContext();

  async function onCreate({ keyPath }) {
    const type = keyPath.pop();
    const config = {};
    const [optionKey] = keyPath;
    if (optionKey) {
      const { value } = instructions.get(type).options.find(item => item.key === optionKey);
      Object.assign(config, value);
    }

    const { data: { data: node } } = await resource.create({
      values: {
        type,
        workflowId: data.data.id,
        upstreamId: upstream?.id ?? null,
        branchIndex,
        config
      }
    });

    onNodeAdded(node);
  }

  const groups = [
    { value: 'control', name: '流程控制' },
    { value: 'model', name: '数据表操作' },
  ];
  const instructionList = (Array.from(instructions.getValues()) as Instruction[]);

  return (
    <div className={cx(addButtonClass)}>
      <Dropdown trigger={['click']} overlay={
        <Menu onClick={ev => onCreate(ev)}>
          {groups.map(group => (
            <Menu.ItemGroup key={group.value} title={group.name}>
              {instructionList.filter(item => item.group === group.value).map(item => item.options
              ? (
                <Menu.SubMenu key={item.type} title={item.title}>
                  {item.options.map(option => (
                    <Menu.Item key={option.key}>{option.label}</Menu.Item>
                  ))}
                </Menu.SubMenu>
              )
              : (
                <Menu.Item key={item.type}>{item.title}</Menu.Item>
              ))}
            </Menu.ItemGroup>
          ))}
        </Menu>
      }>
        <Button shape="circle" icon={<PlusOutlined />} />
      </Dropdown>
    </div>
  );
};
