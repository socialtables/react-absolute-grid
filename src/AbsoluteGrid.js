'use strict';

import PropTypes from 'prop-types';

import React from 'react';
import ReactDOM from 'react-dom';
import GridItem from './GridItem.js';
import LayoutManager from './LayoutManager.js';
import DragManager from './DragManager.js';
import debounce from 'lodash.debounce';
import sortBy from 'lodash.sortby';

export default class AbsoluteGrid extends React.Component {

  running;

  constructor(props){
    super(props);
    this.running = false;
    this.onResize = debounce(this.onResize, 150);
    this.createGrid = this.createGrid.bind(this);
    this.dragManager = new DragManager(this.props.onMove, this.props.keyProp);
    this.state = {
      layoutWidth: 0,
      dragItemId: 0,
      initialScrollPosition: props.scrollPosition,
      itemsAlreadyLoaded: {},
      gridItems: [],
      totalHeight: 0
    };
  }

  render() {
    if(!this.state.layoutWidth || !this.props.items.length){
      return <div />;
    }

    var gridStyle = {
      position: 'relative',
      display: 'block',
      height: this.state.totalHeight
    };

    return <div style={gridStyle} className="absoluteGrid">{this.state.gridItems}</div>;
  }

  componentDidMount() {
    //If responsive, listen for resize
    if(this.props.responsive){
      window.addEventListener('resize', this.onResize);
    }
    this.onResize();
    this.createGrid(this.props);
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.scrollPosition !== nextProps.scrollPosition || this.props.items !== nextProps.items) {
      this.createGrid(nextProps);
    }
  }

  createGrid(props) {
    var options = {
      itemWidth: props.itemWidth,
      itemHeight: props.itemHeight,
      verticalMargin: props.verticalMargin,
      zoom: props.zoom
    };
    const itemTotalHeight = props.itemHeight + props.verticalMargin;
    const bufferHeight = props.bufferRows * itemTotalHeight;
    const renderStart = props.scrollPosition - bufferHeight;
    const renderEnd = props.containerHeight + props.scrollPosition + bufferHeight;
    var layout = new LayoutManager(options, (this.state.layoutWidth || this.getDOMWidth()));

    var filteredIndex = 0;
    var sortedIndex = {};
    let itemsAlreadyLoaded = this.state.itemsAlreadyLoaded;
    /*
     If we actually sorted the array, React would re-render the DOM nodes
     Creating a sort index just tells us where each item should be
     This also clears out filtered items from the sort order and
     eliminates gaps and duplicate sorts
     */
    sortBy(props.items, props.sortProp).forEach((item) => {
      if(!item[props.filterProp]){
        var key = item[props.keyProp];
        sortedIndex[key] = filteredIndex;
        filteredIndex++;
      }
    });
    var gridItems = props.items.map((item) => {
      var key = item[props.keyProp];
      var index = sortedIndex[key];
      if (props.lazyLoad) {
        const pixelPosition = layout.getPosition(index).y;
        const shouldShow = pixelPosition >= renderStart && pixelPosition <= renderEnd; 
        if (!shouldShow && (!itemsAlreadyLoaded[key] || props.unmountOffScreen)) {
          const emptyStyle = Object.assign({}, props.emptyItemStyle, layout.getEmptyStyle(index));
          return React.cloneElement(props.lazyObject, {
            key,
            index,
            style: emptyStyle,
            itemsLength: props.items.length,
          });
        }
      }
      var style = layout.getStyle(index, props.animation, item[props.filterProp]);
      var gridItem = React.cloneElement(props.displayObject, {
        ...props.displayObject.props, style, item, index, key,
        itemsLength: props.items.length,
        dragEnabled: props.dragEnabled,
        dragManager: this.dragManager
      });
      if (!itemsAlreadyLoaded[key]) {
        itemsAlreadyLoaded[key] = key;
      }
      return gridItem;
    });
    this.setState({
      itemsAlreadyLoaded,
      gridItems,
      totalHeight: layout.getTotalHeight(filteredIndex)
    });
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.onResize);
  }

  onResize = () => {
    if (!this.running) {
      this.running = true;

      if (window.requestAnimationFrame) {
        window.requestAnimationFrame(this.getDOMWidth);
      } else {
        setTimeout(this.getDOMWidth, 66);
      }

    }
  };

  getDOMWidth = () => {
    var width = ReactDOM.findDOMNode(this).clientWidth;
    if(this.state.layoutWidth !== width){
      this.setState({layoutWidth: width}, () => this.createGrid(this.props));
    }
    this.running = false;
    return width;
  };
}

AbsoluteGrid.propTypes = {
  items: PropTypes.arrayOf(PropTypes.object).isRequired,
  displayObject: PropTypes.object,
  lazyObject: PropTypes.object,
  itemWidth: PropTypes.number,
  itemHeight: PropTypes.number,
  verticalMargin: PropTypes.number,
  zoom: PropTypes.number,
  responsive: PropTypes.bool,
  dragEnabled: PropTypes.bool,
  keyProp: PropTypes.string,
  sortProp: PropTypes.string,
  filterProp: PropTypes.string,
  animation: PropTypes.string,
  onMove: PropTypes.func,
  bufferRows: PropTypes.number,
  scrollPosition: PropTypes.number,
  lazyLoad: PropTypes.bool,
  unmountOffScreen: PropTypes.bool,
  emptyItemStyle: PropTypes.object
};

AbsoluteGrid.defaultProps = {
  items: [],
  displayObject: <GridItem/>,
  lazyObject: <div />,
  keyProp: 'key',
  filterProp: 'filtered',
  sortProp: 'sort',
  itemWidth: 128,
  itemHeight: 128,
  verticalMargin: -1,
  responsive: false,
  dragEnabled: false,
  bufferRows: 4,
  lazyLoad: false,
  unmountOffScreen: false,
  emptyItemStyle: {},
  animation: 'transform 300ms ease',
  zoom: 1,
  containerHeight: 0,
  onMove: function(){}
};
