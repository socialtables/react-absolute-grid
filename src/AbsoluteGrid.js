'use strict';

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
    if (this.props.scrollPosition !== nextProps.scrollPosition || this.props.items.length !== nextProps.items.length) {
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
        const scrollMinusPixelPos = props.scrollPosition - pixelPosition;
        const pixelMinusScrollPos = pixelPosition - props.scrollPosition;
        const shouldLoadAbove = (bufferHeight >= scrollMinusPixelPos) && scrollMinusPixelPos >= 0;
        const shouldLoadBelow = (bufferHeight >=  pixelMinusScrollPos) && pixelMinusScrollPos >= 0;
        if (!shouldLoadAbove && !shouldLoadBelow && (!itemsAlreadyLoaded[key] || props.unMountOffScreen)) {
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
  items: React.PropTypes.arrayOf(React.PropTypes.object).isRequired,
  displayObject: React.PropTypes.object,
  lazyObject: React.PropTypes.object,
  itemWidth: React.PropTypes.number,
  itemHeight: React.PropTypes.number,
  verticalMargin: React.PropTypes.number,
  zoom: React.PropTypes.number,
  responsive: React.PropTypes.bool,
  dragEnabled: React.PropTypes.bool,
  keyProp: React.PropTypes.string,
  sortProp: React.PropTypes.string,
  filterProp: React.PropTypes.string,
  animation: React.PropTypes.string,
  onMove: React.PropTypes.func,
  bufferRows: React.PropTypes.number,
  scrollPosition: React.PropTypes.number,
  lazyLoad: React.PropTypes.bool,
  unMountOffScreen: React.PropTypes.bool,
  emptyItemStyle: React.PropTypes.object
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
  unMountOffScreen: false,
  emptyItemStyle: {},
  animation: 'transform 300ms ease',
  zoom: 1,
  onMove: function(){}
};
