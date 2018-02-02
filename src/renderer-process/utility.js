// https://siongui.github.io/2015/02/13/hide-div-when-clicked-outside-it/
exports.checkParent = function(t, elm) {
  while(t.parentNode) {
    if( t == elm ) {return true;}
    t = t.parentNode;
  }
  return false;
}
