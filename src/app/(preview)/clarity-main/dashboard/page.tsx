'use client';

import React from 'react';

export default function WorkbenchDemoPage() {
  return (
    <div style={{ marginTop: '1rem', padding: '0 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>工作台 <span className="badge badge-info">用户视角</span></h2>
        <button className="btn btn-outline">
          <cds-icon shape="plus"></cds-icon> 新建任务
        </button>
      </div>
      <p style={{ color: '#666' }}>欢迎回到您的工作区。以下是您近期需要关注的任务、流程审批和项目进度。</p>
      
      <div className="clr-row" style={{ marginTop: '2rem' }}>
        <div className="clr-col-12 clr-col-md-3">
          <div className="card">
            <div className="card-header">待办事项</div>
            <div className="card-block">
              <div className="card-title">16</div>
              <div className="card-text">您有被分配的日常待办任务未完成。</div>
            </div>
            <div className="card-footer">
              <button className="btn btn-sm btn-link">去处理</button>
            </div>
          </div>
        </div>
        <div className="clr-col-12 clr-col-md-3">
          <div className="card">
            <div className="card-header">待我审批</div>
            <div className="card-block">
              <div className="card-title" style={{ color: '#c92100' }}>3</div>
              <div className="card-text">涉及产品发布与BOM变更流程的审批单。</div>
            </div>
            <div className="card-footer">
              <button className="btn btn-sm btn-link">立即审批</button>
            </div>
          </div>
        </div>
        <div className="clr-col-12 clr-col-md-3">
          <div className="card">
            <div className="card-header">参与项目</div>
            <div className="card-block">
              <div className="card-title">8</div>
              <div className="card-text">活跃的研发与实施项目数量。</div>
            </div>
            <div className="card-footer">
              <button className="btn btn-sm btn-link">查看详情</button>
            </div>
          </div>
        </div>
        <div className="clr-col-12 clr-col-md-3">
          <div className="card">
            <div className="card-header">系统通知</div>
            <div className="card-block">
              <div className="card-title" style={{ color: '#0072a3' }}>24</div>
              <div className="card-text">未读系统公告及业务流转通知。</div>
            </div>
            <div className="card-footer">
              <button className="btn btn-sm btn-link">标记已读</button>
            </div>
          </div>
        </div>
      </div>

      <h3 style={{ marginTop: '2rem' }}>近期流程实例</h3>
      <div className="datagrid" style={{ marginTop: '1rem' }}>
        <div className="datagrid-header">
           <div className="datagrid-row">
             <div className="datagrid-column flex-1">实例名称</div>
             <div className="datagrid-column flex-1">流程类型</div>
             <div className="datagrid-column flex-1">当前节点</div>
             <div className="datagrid-column flex-1">发起人</div>
             <div className="datagrid-column flex-1">状态</div>
             <div className="datagrid-column flex-1">更新时间</div>
           </div>
        </div>
        <div className="datagrid-table">
          <div className="datagrid-row">
            <div className="datagrid-cell flex-1">V2.4 产品BOM归档</div>
            <div className="datagrid-cell flex-1">BOM 变更</div>
            <div className="datagrid-cell flex-1">主管审核</div>
            <div className="datagrid-cell flex-1">李明</div>
            <div className="datagrid-cell flex-1"><span className="label label-info">流转中</span></div>
            <div className="datagrid-cell flex-1">10 分钟前</div>
          </div>
          <div className="datagrid-row">
            <div className="datagrid-cell flex-1">Q3包装设计方案评审</div>
            <div className="datagrid-cell flex-1">文档审批</div>
            <div className="datagrid-cell flex-1">-</div>
            <div className="datagrid-cell flex-1">王建国</div>
            <div className="datagrid-cell flex-1"><span className="label label-success">已完成</span></div>
            <div className="datagrid-cell flex-1">昨天 16:30</div>
          </div>
          <div className="datagrid-row">
            <div className="datagrid-cell flex-1">新材质引入技术可行性评估</div>
            <div className="datagrid-cell flex-1">研发立项</div>
            <div className="datagrid-cell flex-1">技术总监签发</div>
            <div className="datagrid-cell flex-1">赵丽</div>
            <div className="datagrid-cell flex-1"><span className="label label-warning">已驳回</span></div>
            <div className="datagrid-cell flex-1">2 天前</div>
          </div>
          <div className="datagrid-row">
            <div className="datagrid-cell flex-1">11</div>
            <div className="datagrid-cell flex-1">22</div>
            <div className="datagrid-cell flex-1">33</div>
            <div className="datagrid-cell flex-1">44</div>
            <div className="datagrid-cell flex-1"><span className="label label-warning">已驳回</span></div>
            <div className="datagrid-cell flex-1">2 天前</div>
          </div>
        </div>
      </div>
    </div>
  );
}