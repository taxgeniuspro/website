#!/bin/bash
codes="aa ar aw bh cg cs cl cbw ds dw dh eb ge gw hh iw iw1 jp jm kw kp lf lb mj mf ow pj rh sw sj tp tw wc yw ah"
for code in $codes; do
  url="https://res.cloudinary.com/dhktmiigh/image/upload/v1765487892/taxgeniuspro/preparers/preparer_${code}.jpg"
  status=$(curl -sI "$url" 2>/dev/null | head -1 | awk '{print $2}')
  if [ "$status" = "200" ]; then
    echo "✅ $code: jpg"
  else
    url_png="https://res.cloudinary.com/dhktmiigh/image/upload/v1765487892/taxgeniuspro/preparers/preparer_${code}.png"
    status_png=$(curl -sI "$url_png" 2>/dev/null | head -1 | awk '{print $2}')
    if [ "$status_png" = "200" ]; then
      echo "✅ $code: png"
    else
      echo "❌ $code: NOT FOUND"
    fi
  fi
done
